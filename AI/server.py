"""Basic LevelUP OpenRouter test backend. Goal/plan validation is external."""
import ast
import copy
import json
import math
import tempfile
import uuid
import os
from datetime import date, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
JOURNEY_OPTIONS = [30, 60, 90]
INCREMENT_EVERY_DAYS = 10
INCREMENT_MINUTES = 30
PLANS_DIR = ROOT / "work" / "plans"


class APIError(Exception):
    def __init__(self, status, message):
        self.status = status
        super().__init__(message)


def load_env():
    """Load local API configuration without exposing it to the frontend."""
    path = ROOT / ".env"
    if path.exists():
        for line in path.read_text(encoding="utf-8-sig").splitlines():
            if line.strip() and not line.lstrip().startswith("#"):
                key, separator, value = line.partition("=")
                if separator and key.strip() in {"OPENROUTER_API_KEY", "OPENROUTER_MODEL"}:
                    os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


def openrouter_settings():
    """Read the unchanged example file without executing its demo requests."""
    source = (ROOT / "openrouter.py").read_text(encoding="utf-8-sig")
    strings = [n.value for n in ast.walk(ast.parse(source))
               if isinstance(n, ast.Constant) and isinstance(n.value, str)]
    return {
        "url": next(v for v in strings if v == "https://openrouter.ai/api/v1/chat/completions"),
        "model": next(v for v in strings if v.startswith("nvidia/")),
        "key": next((v.removeprefix("Bearer ").strip() for v in strings if v.startswith("Bearer ")), ""),
    }


def get_api_key():
    """Prefer .env; fall back to the API key in the user's OpenRouter example."""
    load_env()
    return os.environ.get("OPENROUTER_API_KEY", "").strip() or openrouter_settings()["key"]


def configured_model():
    load_env()
    return os.environ.get("OPENROUTER_MODEL", "").strip() or openrouter_settings()["model"]


def request_ai(messages, timeout=60, max_tokens=8192):
    """Send one chat request without retries, cache, or goal validation."""
    key = get_api_key()
    if not key:
        raise APIError(503, "Add an OpenRouter API key to .env or openrouter.py.")
    body = {"model": configured_model(), "messages": messages,
            "reasoning": {"enabled": False}, "max_tokens": max_tokens, "stream": False}
    request = Request(openrouter_settings()["url"], data=json.dumps(body).encode("utf-8"),
                      headers={"Content-Type": "application/json", "Authorization": "Bearer " + key}, method="POST")
    try:
        with urlopen(request, timeout=timeout) as response:
            result = json.load(response)
        if "error" in result:
            code = result["error"].get("code", 502)
            raise APIError(429 if code == 429 else 502, f"OpenRouter returned an API error ({code}).")
        return result
    except HTTPError as error:
        code = error.code
        error.close()
        raise APIError(429 if code == 429 else 502, f"OpenRouter HTTP {code}. Check your key, model, or quota.") from None
    except (TimeoutError, URLError):
        raise APIError(502, "Could not reach OpenRouter or the request timed out.") from None
    except (ValueError, TypeError, AttributeError):
        raise APIError(502, "OpenRouter returned an unreadable response.") from None


def test_api_connection(timeout=20):
    """Return True if the configured model replies; otherwise return False."""
    try:
        response = request_ai([{"role": "user", "content": "Reply with only OK."}],
                              timeout=timeout, max_tokens=64)
        choice = response["choices"][0]
        content = choice["message"]["content"]
        return bool(choice.get("finish_reason") == "stop" and isinstance(content, str) and content.strip())
    except (APIError, OSError, ValueError, KeyError, IndexError, TypeError, AttributeError, StopIteration):
        return False


def parse_ai_response(response):
    """Decode the assistant's JSON text. Do not validate tasks or quantities."""
    try:
        choice = response["choices"][0]
        if choice.get("finish_reason") == "length":
            raise APIError(502, "AI template output was truncated. Reduce the number of goals or increase max_tokens.")
        text = choice["message"]["content"].strip()
        if text.startswith("```") and text.endswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        return json.loads(text)
    except (ValueError, KeyError, IndexError, TypeError, AttributeError):
        raise APIError(502, "The AI response could not be read as JSON.") from None


def build_prompt(user_input):
    """Fill only named placeholders; preserve the JSON braces in the template."""
    days = user_input["journeyDays"]
    start = date.fromisoformat(user_input["startDate"])
    end = start + timedelta(days=days - 1)
    prompt = (ROOT / "planner_prompt.txt").read_text(encoding="utf-8-sig")
    return (prompt.replace("{{journeyDays}}", str(days))
                  .replace("{{startDate}}", start.isoformat())
                  .replace("{{endDate}}", end.isoformat()))


def daily_targets(goal, index, journey_days):
    """Allocate recurring targets locally, including recovery days for exercise."""
    targets = copy.deepcopy(goal.get("target", []))
    block_days = min(7, journey_days - (index // 7) * 7)
    offset = index % 7
    if goal.get("type") == "exercise":
        metrics = {t["metric"]: t for t in targets}
        sessions = min(block_days, math.ceil(metrics["workoutFrequency"]["value"] * block_days / 7))
        # Spread the final partial week across its available days.
        if block_days < 7:
            slots = {block_days - 1} if sessions == 1 else {round(i * (block_days - 1) / (sessions - 1)) for i in range(sessions)}
        else:
            slots = {i * block_days // sessions for i in range(sessions)}
        if offset not in slots:
            return []
        return [{**metrics["workoutFrequency"], "value": 1, "period": "day"},
                {**metrics["workoutDuration"], "period": "day"}]
    allocated = []
    for target in targets:
        if target["period"] == "week":
            if target["unit"] == "sessions":
                sessions = min(block_days, math.ceil(target["value"] * block_days / 7))
                target["value"] = 1 if offset in {i * block_days // sessions for i in range(sessions)} else 0
            elif target["unit"] == "minutes":
                target["value"] = math.ceil(target["value"] * (offset + 1) / 7) - math.ceil(target["value"] * offset / 7)
            else:
                target["value"] /= 7
        target["period"] = "day"
        if target["value"] != 0:
            allocated.append(target)
    return allocated


def main_goal_settings(goal, journey_days=None):
    """Save the input baseline and the constant progression variables."""
    settings = copy.deepcopy(goal)
    settings.pop("progression", None)
    baseline = sum(t["value"] / (7 if t["period"] == "week" else 1)
                   for t in goal.get("target", []) if t["unit"] == "minutes")
    increases = baseline > 0 and goal.get("type") not in {"hydration", "sleep", "wakeUp"}
    settings.update(startingMinutes=baseline, incrementEveryDays=INCREMENT_EVERY_DAYS,
                    incrementMinutes=INCREMENT_MINUTES if increases else 0)
    return settings


def progression_minutes(settings, day, starting_minutes=None):
    """Days 1-10 use the baseline; days 11-20 add 30 minutes, etc."""
    baseline = settings["startingMinutes"] if starting_minutes is None else starting_minutes
    return baseline + ((day - 1) // settings["incrementEveryDays"]) * settings["incrementMinutes"]


def set_minute_budget(targets, minutes):
    """Distribute the day's time across its minute targets without changing units."""
    timed = [t for t in targets if t["unit"] == "minutes"]
    total = sum(t["value"] for t in timed)
    assigned = 0
    for index, target in enumerate(timed):
        amount = round(minutes - assigned, 2) if index == len(timed) - 1 else round(minutes * target["value"] / total, 2)
        target["value"] = amount
        assigned += amount
    return targets


def sidequest_settings(goal):
    """Track actual completion separately from time reserved in the schedule."""
    starting = sum(t["value"] * (60 if t["unit"] == "hours" else 1) / (7 if t["period"] == "week" else 1)
                   for t in goal.get("target", []) if t["unit"] in {"minutes", "hours"})
    daily_minutes = goal.get("dailyMinutes", round(starting, 2))
    total_hours = goal.get("totalHours")
    completed_minutes = goal.get("completedMinutes", 0)
    remaining = None if total_hours is None else max(0, total_hours * 60 - completed_minutes)
    return {**copy.deepcopy(goal), "dailyMinutes": daily_minutes, "totalHours": total_hours,
            "completedMinutes": completed_minutes, "completed": goal.get("completed", False),
            "remainingMinutes": remaining, "plannedMinutes": 0,
            "remainingUnscheduledMinutes": remaining,
            "budgetReached": remaining == 0 if remaining is not None else False}


def make_todo(goal, category, targets, templates, active_minutes=None):
    template = templates.get(goal["goalId"], {})
    labels = {"exercise": "Workout", "hydration": "Drink water", "sleep": "Sleep schedule",
              "wakeUp": "Wake up", "learning": "Study or read"}
    title = template.get("title") or goal.get("title") or labels.get(goal.get("type"), "Complete your goal")
    quantities = "; ".join(f"{t['metric']}: {t['value']} {t['unit']}" for t in targets)
    criteria = template.get("completionCriteria") or "Complete and record the activity."
    minutes = sum(t["value"] for t in targets if t["unit"] == "minutes") if active_minutes is None else active_minutes
    return {"goalId": goal["goalId"], "category": category, "title": title,
            "target": targets, "activeMinutes": math.ceil(minutes),
            "completionCriteria": criteria + " Today's targets: " + quantities}


def expand_plan(user_input, ai_result):
    """Generate the full local schedule. Goal/response validation is external."""
    days = user_input["journeyDays"]
    start = date.fromisoformat(user_input["startDate"])
    main_goals = [main_goal_settings(g, days) for g in user_input.get("mainTasks", [])]
    side_goals = [sidequest_settings(g) for g in user_input.get("sideQuests", [])]
    templates = {t["goalId"]: t for t in ai_result.get("templates", [])}
    plan = {"days": [], "warnings": list(ai_result.get("warnings", [])),
            "variables": {"journeyDays": days, "incrementEveryDays": INCREMENT_EVERY_DAYS,
                          "incrementMinutes": INCREMENT_MINUTES, "startDate": start.isoformat(),
                          "endDate": (start + timedelta(days=days - 1)).isoformat(),
                          "userInput": copy.deepcopy(user_input), "mainGoals": main_goals, "sideQuests": side_goals},
            "aiTemplates": copy.deepcopy(ai_result), "completionHistory": []}
    for goal in main_goals:
        if goal.get("type") == "hydration":
            for target in goal.get("target", []):
                if target["unit"] == "liters":
                    target["value"] = min(target["value"], 2)
    for index in range(days):
        day_date = (start + timedelta(days=index)).isoformat()
        todos = []
        for goal in main_goals:
            targets = daily_targets(goal, index, days)
            if not targets:
                continue
            if goal["incrementMinutes"]:
                baseline = sum(t["value"] for t in targets if t["unit"] == "minutes")
                targets = set_minute_budget(targets, progression_minutes(goal, index + 1, baseline))
            # Water, sleep and wake-up retain their fixed input targets.
            todos.append(make_todo(goal, "main", targets, templates))
        for goal in side_goals:
            if goal["completed"] or (goal.get("deadline") and day_date > goal["deadline"]):
                continue
            if goal.get("progressAsOfDate") and day_date <= goal["progressAsOfDate"]:
                continue
            remaining = goal["remainingUnscheduledMinutes"]
            if remaining is not None and remaining <= 0:
                continue
            daily_minutes = goal["dailyMinutes"] if remaining is None else min(goal["dailyMinutes"], remaining)
            targets = []
            timed = [t for t in goal.get("target", []) if t["unit"] in {"minutes", "hours"}]
            weights = sum(t["value"] * (60 if t["unit"] == "hours" else 1) / (7 if t["period"] == "week" else 1) for t in timed)
            for original in goal.get("target", []):
                target = {**original, "period": "day"}
                if original["unit"] in {"minutes", "hours"}:
                    weight = original["value"] * (60 if original["unit"] == "hours" else 1) / (7 if original["period"] == "week" else 1)
                    target["value"] = round(daily_minutes * weight / weights / (60 if original["unit"] == "hours" else 1), 4)
                elif original["period"] == "week":
                    target["value"] = original["value"] / 7
                targets.append(target)
            if daily_minutes and not timed:
                targets.append({"metric": "questTime", "value": daily_minutes, "unit": "minutes", "period": "day"})
            if not targets:
                continue
            todos.append(make_todo(goal, "side", targets, templates, daily_minutes))
            goal["plannedMinutes"] = round(goal["plannedMinutes"] + daily_minutes, 4)
            if remaining is not None:
                goal["remainingUnscheduledMinutes"] = round(max(0, remaining - daily_minutes), 4)
        day = {"day": index + 1, "date": day_date, "todos": todos,
               "totalActiveMinutes": sum(t["activeMinutes"] for t in todos)}
        day["bullets"] = tasks_to_bullets(day)
        plan["days"].append(day)
    return plan


def save_plan(plan):
    """Save settings, templates, schedule and progress without storing API keys."""
    plan.setdefault("planId", uuid.uuid4().hex)
    path = PLANS_DIR / (uuid.UUID(plan["planId"]).hex + ".json")
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent, suffix=".tmp", delete=False) as file:
        temporary = Path(file.name)
        json.dump(plan, file, ensure_ascii=False, indent=2)
    try:
        temporary.replace(path)
    finally:
        if temporary.exists():
            temporary.unlink()
    return plan


def get_saved_plan(plan_id):
    """UUID filenames keep file access inside the local plans folder."""
    path = PLANS_DIR / (uuid.UUID(plan_id).hex + ".json")
    plan = json.loads(path.read_text(encoding="utf-8"))
    for day in plan.get("days", []):
        day["bullets"] = tasks_to_bullets(day)
    return plan


def update_sidequest_progress(plan_id, goal_id, completed_minutes, completed=None, as_of_date=None):
    """Save cumulative actual minutes and rebuild only the future from saved templates.

    Calling twice with the same total does not count minutes twice. No AI call.
    Completing the hour budget does not automatically mark the goal achieved.
    """
    old = get_saved_plan(plan_id)
    data = copy.deepcopy(old["variables"]["userInput"])
    as_of_date = as_of_date or date.today().isoformat()
    goal = next(g for g in data["sideQuests"] if g["goalId"] == goal_id)
    goal["completedMinutes"] = completed_minutes
    goal["progressAsOfDate"] = as_of_date
    if completed is not None:
        goal["completed"] = completed
    plan = expand_plan(data, old["aiTemplates"])
    past = {d["date"]: d for d in old["days"] if d["date"] <= as_of_date}
    plan["days"] = [copy.deepcopy(past.get(d["date"], d)) for d in plan["days"]]
    for day in plan["days"]:
        day["bullets"] = tasks_to_bullets(day)
    plan["planId"] = old["planId"]
    plan["completionHistory"] = old.get("completionHistory", []) + [{"goalId": goal_id, "date": as_of_date,
        "completedMinutes": completed_minutes, "completed": goal.get("completed", False)}]
    return save_plan(plan)


def generate_plan(user_input):
    """Check connectivity, request day-one templates, then build all days locally."""
    if not test_api_connection():
        raise APIError(502, "AI connection check failed. Check your key, model availability, or quota.")
    request_data = copy.deepcopy(user_input)
    for goal in request_data.get("mainTasks", []):
        goal.pop("progression", None)
    request_data["planningWindow"] = {"startDay": 1, "endDay": 1,
                                      "startDate": user_input["startDate"], "endDate": user_input["startDate"]}
    response = request_ai([{"role": "system", "content": build_prompt(user_input) + "\nBackend scheduling override: ignore old progression settings. The backend adds 30 minutes to each active main goal every 10 calendar days. Water, sleep, wake-up and side quests remain fixed. Return only day-one templates, never the full schedule."},
                           {"role": "user", "content": json.dumps(request_data, ensure_ascii=False)}])
    return save_plan(expand_plan(user_input, parse_ai_response(response)))


def add_main_goal(user_input, goal):
    updated = copy.deepcopy(user_input)
    updated.setdefault("mainTasks", []).append(copy.deepcopy(goal))
    return updated


def add_sidequest(user_input, side_quest):
    updated = copy.deepcopy(user_input)
    updated.setdefault("sideQuests", []).append(copy.deepcopy(side_quest))
    return updated


def delete_main_goal(user_input, goal_id):
    updated = copy.deepcopy(user_input)
    updated["mainTasks"] = [g for g in updated.get("mainTasks", []) if g.get("goalId") != goal_id]
    return updated


def delete_sidequest(user_input, goal_id):
    updated = copy.deepcopy(user_input)
    updated["sideQuests"] = [g for g in updated.get("sideQuests", []) if g.get("goalId") != goal_id]
    return updated


def get_daily_tasks(plan_json, target_date=None):
    """Read one scheduled day, including display bullets, from plan JSON."""
    plan = json.loads(plan_json) if isinstance(plan_json, str) else plan_json
    for day in plan.get("days", []):
        if target_date is None or day.get("date") == target_date:
            result = copy.deepcopy(day)
            result["bullets"] = tasks_to_bullets(result)
            return result
    raise LookupError("No tasks returned for this date.")


def tasks_to_bullets(day):
    """Format display text such as 'Read a chapter: 30 minutes'."""
    bullets = []
    for todo in day.get("todos", []):
        targets = todo.get("target", [])
        minute_targets = [t for t in targets if t.get("unit") == "minutes"]
        if minute_targets:
            amount = f"{sum(t['value'] for t in minute_targets):g} minutes"
        else:
            amount = ", ".join(str(t.get("value", "")) + ("" if t.get("unit") == "time" else " " + t.get("unit", "")) for t in targets)
            if not amount and todo.get("activeMinutes"):
                amount = f"{todo['activeMinutes']} minutes"
        title = todo.get("title") or todo.get("goalId", "Task")
        bullets.append(f"{title}: {amount}" if amount else title)
    return bullets


def print_all_daily_tasks(json_file, output=None):
    """Read a saved plan file and print all its days as bullet lists.

    json_file: string or Path to the full plan saved by generate_plan().
    output: optional writable stream; defaults to the terminal.
    Returns the formatted text so other callers can display it too.
    This reads existing tasks and never calls AI or changes quantities.
    """
    plan = json.loads(Path(json_file).read_text(encoding="utf-8-sig"))
    sections = []
    for day in plan.get("days", []):
        lines = [f"Day {day['day']} ({day['date']})"]
        bullets = tasks_to_bullets(day)
        lines.extend(f"- {bullet}" for bullet in bullets)
        if not bullets:
            lines.append("- No tasks scheduled.")
        sections.append("\n".join(lines))
    text = "\n\n".join(sections)
    print(text, file=output)
    return text


class Handler(BaseHTTPRequestHandler):
    def reply(self, status, value, location=None):
        content = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-store")
        if location is not None:
            self.send_header("Location", location)
        self.end_headers()
        self.wfile.write(content)

    def do_GET(self):
        if self.path == "/":
            content = (ROOT / "index.html").read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        elif self.path.startswith("/api/plans/"):
            try:
                self.reply(200, get_saved_plan(self.path.removeprefix("/api/plans/")))
            except (ValueError, FileNotFoundError):
                self.reply(404, {"error": "Saved plan not found."})
        elif self.path == "/api/sample":
            self.reply(200, json.loads((ROOT / "test-request.json").read_text(encoding="utf-8-sig")))
        elif self.path == "/api/health":
            self.reply(200, {"status": "ok", "provider": "openrouter", "model": configured_model(),
                             "keyConfigured": bool(get_api_key()), "journeyOptions": JOURNEY_OPTIONS})
        else:
            self.reply(404, {"error": "Not found."})

    def handle_json_request(self, deleting=False):
        try:
            # JSON decoding is transport handling; business validation is external.
            body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", "0"))))
            if deleting and self.path == "/api/goals/main":
                result = delete_main_goal(body["input"], body["goalId"])
            elif deleting and self.path == "/api/goals/side":
                result = delete_sidequest(body["input"], body["goalId"])
            elif not deleting and self.path == "/api/connection":
                result = test_api_connection()
            elif not deleting and self.path in {"/api/plans", "/api/roadmap"}:
                # The request body is the user input; the response is the full JSON plan.
                result = generate_plan(body)
                if self.path == "/api/plans":
                    self.reply(201, result, location="/api/plans/" + result["planId"])
                    return
            elif not deleting and self.path == "/api/sidequest/progress":
                result = update_sidequest_progress(body["planId"], body["goalId"], body["completedMinutes"],
                                                  body.get("completed"), body.get("asOfDate"))
            elif not deleting and self.path == "/api/goals/main":
                result = add_main_goal(body["input"], body["goal"])
            elif not deleting and self.path == "/api/goals/side":
                result = add_sidequest(body["input"], body["sideQuest"])
            elif not deleting and self.path == "/api/daily-tasks":
                result = get_daily_tasks(body["plan"], body.get("date"))
                result["bullets"] = tasks_to_bullets(result)
            else:
                self.reply(404, {"error": "Not found."})
                return
            self.reply(200, result)
        except APIError as error:
            self.reply(error.status, {"error": str(error)})
        except (LookupError, ValueError, TypeError, AttributeError, StopIteration):
            self.reply(400, {"error": "Could not read the request or task data. Check the JSON field names and format."})
        except OSError:
            self.reply(500, {"error": "Could not read the local API configuration or prompt file."})

    def do_POST(self):
        self.handle_json_request()

    def do_DELETE(self):
        self.handle_json_request(deleting=True)


if __name__ == "__main__":
    load_env()
    server = ThreadingHTTPServer(("127.0.0.1", 8000), Handler)
    print("LevelUP API test (30 / 60 / 90 days): http://127.0.0.1:8000", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
