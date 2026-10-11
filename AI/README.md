# LevelUP local journey scheduler

```powershell
py -m unittest -v
py server.py
```

Stop the old server with Ctrl+C, restart and refresh http://127.0.0.1:8000.
Choose 30, 60 or 90 days. The server makes ONE AI request for day-one activity
templates for all goals, including goals not scheduled that day. Local code
then generates the entire journey and saves it under work/plans/<planId>.json.
The manual connection-test button still makes a separate small API request.
No API key is saved in a plan; openrouter.py and .env are unchanged.
Business validation is still external; these functions apply scheduling rules.

## Input variables

journeyDays: integer (30/60/90). startDate: YYYY-MM-DD string.
mainTasks and sideQuests: lists of goal objects, as in test-request.json.

An active main goal can include:

```json
"progression": {"maxMinutes": 60, "rampDays": 30, "mode": "increase"}
```

maxMinutes is the per-session maximum for exercise, or per-day maximum for
other active goals. rampDays counts calendar days from the journey start.
mode is increase, hold, or reduce. With no progression object, active minute
main goals ramp to twice their starting duration over 30 days, then plateau.
Set explicit caps to personalize this default. Hold keeps the input durations;
reduce ramps toward a lower maxMinutes. Weekly learning starts at its weekly
minutes divided by seven. This changes duration only, not exercise frequency.

Exercise is spaced across journey weeks, preserving requested sessions and
recovery days. Partial weeks prorate and round up session counts, capped at
available days. The final partial-week workout includes the last journey day.
Hydration stays at the selected amount, capped at 2 liters, every day.
Bedtime, wake-up and sleep duration are fixed; they never increase in difficulty.

Side quests support:

```json
{"dailyMinutes": 30, "totalHours": 10, "completedMinutes": 0, "completed": false}
```

These fields accompany goalId, title, target and deadline. dailyMinutes is
constant and otherwise derived from minute/hour targets (weekly divided by 7).
totalHours is optional/null for no time budget. completedMinutes is actual
cumulative work, not planned work. completed is an explicit goal-finished flag.
Tasks repeat until the inclusive deadline or remaining time is fully allocated.
The last session may be shorter to avoid exceeding the budget. Money/other
non-time quests repeat their quantities and do not require a time budget.

Saved variables contain original userInput, normalized mainGoals (starting
minutes, cap, ramp, mode), sideQuests (actual completed and planned minutes,
remainingMinutes and remainingUnscheduledMinutes), and journey dates.
The saved file also contains aiTemplates, daily tasks and completionHistory.
A fully allocated schedule does NOT set completed or completedMinutes.
Reaching the actual hour budget stops scheduling without claiming goal success.

## Progress and saved-plan routes

GET /api/plans/<planId> loads a saved plan without AI. Use the webpage's Load
saved plan control after refreshing or restarting the server.

POST /api/sidequest/progress accepts:

```json
{"planId":"YOUR_PLAN_ID", "goalId":"side-project", "completedMinutes":60,
 "completed":false, "asOfDate":"2026-10-12"}
```

completedMinutes is a cumulative total. Setting the same total twice does not
double-count it. asOfDate defaults to the server's current local date; frontend
supplies the selected date. The server preserves past tasks, recalculates future
side-quest allocation using saved templates, records history and saves the same
plan ID without calling AI. Future plannedMinutes exclude preserved past tasks.
Use the progress controls to report actual time or explicitly finish a goal.

Existing routes remain: POST /api/roadmap, /api/connection, /api/daily-tasks,
/api/goals/main and /api/goals/side; DELETE /api/goals/main and /api/goals/side;
GET /api/sample and /api/health. Goal edits change copied input and require a
new generation to change that plan. Daily tasks include frontend bullet strings.

The backend uses get_api_key, test_api_connection, request_ai, parse_ai_response,
build_prompt, generate_plan, expand_plan, progression_minutes, save_plan,
get_saved_plan and update_sidequest_progress. Goal add/delete methods remain.

This is local storage for a local test app with no user accounts or database.
AI titles/criteria are reused, while quantities are calculated locally. Updating
progress recomputes future tasks; missed days are not silently treated as done.
Offline tests mock API output; provider availability still depends on OpenRouter.
