"""Offline tests for one-request templates and the local journey scheduler."""
import copy
import io
import json
import math
import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path
from http.client import HTTPResponse
from unittest.mock import patch
import server


def sample_input(days=30):
    data=json.loads((server.ROOT/'test-request.json').read_text(encoding='utf-8-sig'))
    data['journeyDays']=days
    return data


def templates(data):
    return {'templates':[{'goalId':g['goalId'],'title':g.get('title',g.get('type','Task')),
            'completionCriteria':'Complete the session and record progress.'} for g in data['mainTasks']+data['sideQuests']], 'warnings':[]}


def response(result):
    return {'choices':[{'finish_reason':'stop','message':{'content':json.dumps(result)}}]}


def todos(plan, goal_id):
    return [t for d in plan['days'] for t in d['todos'] if t['goalId']==goal_id]


class IsolatedPlans(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.directory=Path(self.temp.name).resolve()
        assert self.directory.is_relative_to(Path(tempfile.gettempdir()).resolve())
        self.addCleanup(self.temp.cleanup)
        self.storage=patch('server.PLANS_DIR',self.directory); self.storage.start(); self.addCleanup(self.storage.stop)
    def expand(self, data=None):
        data=data or sample_input()
        return server.expand_plan(data,templates(data))


class SchedulerTests(IsolatedPlans):
    def test_all_durations_and_dates_without_ai(self):
        for length in (30,60,90):
            plan=self.expand(sample_input(length))
            self.assertEqual(len(plan['days']),length)
            self.assertEqual([d['day'] for d in plan['days']],list(range(1,length+1)))
            self.assertEqual(plan['days'][-1]['date'],(date.fromisoformat(plan['variables']['startDate'])+timedelta(days=length-1)).isoformat())
    def test_workout_increment_every_ten_days(self):
        data=sample_input(90); data['mainTasks'][0]['target'][0]['value']=7
        workouts=todos(self.expand(data),'main-exercise')
        for day in range(1,91):
            self.assertEqual(workouts[day-1]['activeMinutes'],30+((day-1)//10)*30)
    def test_workout_frequency_recovery_and_partial_weeks(self):
        for length in (30,60,90):
            for frequency in range(1,8):
                data=sample_input(length); data['mainTasks'][0]['target'][0]['value']=frequency
                plan=self.expand(data)
                for offset in range(0,length,7):
                    block=plan['days'][offset:offset+7]
                    scheduled=sum(any(t['goalId']=='main-exercise' for t in d['todos']) for d in block)
                    self.assertEqual(scheduled,min(len(block),math.ceil(frequency*len(block)/7)))
                self.assertEqual(todos(plan,'main-exercise')[-1]['activeMinutes'],30+((length-1)//10)*30)
    def test_hydration_fixed_and_capped(self):
        for value in (1.5,2,3):
            data=sample_input(90); data['mainTasks'][1]['target'][0]['value']=value
            data['mainTasks'][1]['progression']={'maxMinutes':100,'mode':'increase'}
            plan=self.expand(data)
            self.assertEqual([t['target'][0]['value'] for t in todos(plan,'main-hydration')],[min(value,2)]*90)
    def test_sleep_and_wake_never_ramp(self):
        data=sample_input(90)
        for goal in data['mainTasks']:
            if goal['type'] in ('sleep','wakeUp'): goal['progression']={'maxMinutes':1000,'mode':'increase'}
        plan=self.expand(data)
        for goal in data['mainTasks']:
            if goal['type'] in ('sleep','wakeUp'):
                self.assertTrue(all(t['target']==goal['target'] for t in todos(plan,goal['goalId'])))
    def test_learning_constant_steps_replace_old_progression(self):
        data=sample_input(90); goal=data['mainTasks'][-1]
        goal['progression']={'maxMinutes':40,'rampDays':30,'mode':'hold'}
        result=todos(self.expand(data),goal['goalId'])
        for day,task in enumerate(result,1):
            self.assertEqual(task['activeMinutes'],20+((day-1)//10)*30)
    def test_every_day_returns_matching_bullets(self):
        for length in (30,60,90):
            plan=self.expand(sample_input(length))
            for day in plan['days']:
                self.assertEqual(day['bullets'],server.tasks_to_bullets(day))
                self.assertEqual(len(day['bullets']),len(day['todos']))
                self.assertTrue(all(isinstance(b,str) for b in day['bullets']))
    def test_weekly_learning_and_split_targets(self):
        data=sample_input(); goal=data['mainTasks'][-1]
        goal['target']=[{'metric':'reading','value':70,'unit':'minutes','period':'week'},
                        {'metric':'study','value':70,'unit':'minutes','period':'week'}]
        result=todos(self.expand(data),goal['goalId'])
        self.assertEqual(sum(t['activeMinutes'] for t in result[:7]),140)
        self.assertEqual(result[9]['activeMinutes'],20)
        self.assertEqual(result[10]['activeMinutes'],50)
        self.assertEqual(sum(t['value'] for t in result[10]['target']),50)
    def test_side_repeats_until_hours_allocated_but_not_completed(self):
        plan=self.expand(sample_input(90)); side=todos(plan,'side-project')
        self.assertEqual(len(side),20); self.assertEqual([t['activeMinutes'] for t in side],[30]*20)
        state=plan['variables']['sideQuests'][0]
        self.assertEqual(state['plannedMinutes'],600); self.assertEqual(state['completedMinutes'],0)
        self.assertFalse(state['completed']); self.assertFalse(state['budgetReached'])
        self.assertEqual(state['remainingMinutes'],600); self.assertEqual(state['remainingUnscheduledMinutes'],0)
    def test_side_last_session_shortened_to_remaining_budget(self):
        data=sample_input(); data['sideQuests'][0]['totalHours']=1.2
        result=todos(self.expand(data),'side-project')
        self.assertEqual([t['activeMinutes'] for t in result],[30,30,12])
    def test_side_deadline_inclusive(self):
        data=sample_input(); goal=data['sideQuests'][0]; goal['totalHours']=None
        goal['deadline']=(date.fromisoformat(data['startDate'])+timedelta(days=2)).isoformat()
        self.assertEqual(len(todos(self.expand(data),'side-project')),3)
    def test_completed_or_budget_reached_side_not_scheduled(self):
        for completed,minutes in [(True,0),(False,600)]:
            data=sample_input(); data['sideQuests'][0].update(completed=completed,completedMinutes=minutes)
            self.assertEqual(todos(self.expand(data),'side-project'),[])
    def test_savings_quest_has_no_time_budget(self):
        data=sample_input(); data['sideQuests']=[{'goalId':'save','title':'Save money','target':[{'metric':'savings','value':5,'unit':'USD','period':'day'}],'deadline':None}]
        plan=self.expand(data); saving=todos(plan,'save')
        self.assertEqual(len(saving),30); self.assertTrue(all(t['activeMinutes']==0 for t in saving))
        self.assertTrue(all(t['target'][0]['value']==5 for t in saving))
    def test_total_active_time_and_input_not_mutated(self):
        data=sample_input(); original=copy.deepcopy(data); plan=self.expand(data)
        self.assertEqual(data,original)
        self.assertTrue(all(d['totalActiveMinutes']==sum(t['activeMinutes'] for t in d['todos']) for d in plan['days']))


class PersistenceAndClientTests(IsolatedPlans):
    @patch('server.request_ai')
    @patch('server.test_api_connection')
    def test_exactly_one_ai_request_then_saved_full_plan(self, connection, request):
        data=sample_input(90); request.return_value=response(templates(data))
        plan=server.generate_plan(data)
        request.assert_called_once(); connection.assert_called_once()
        sent=json.loads(request.call_args.args[0][-1]['content'])
        self.assertEqual(sent['planningWindow']['startDay'],1); self.assertEqual(sent['planningWindow']['endDay'],1)
        self.assertEqual(len(plan['days']),90)
        self.assertEqual(server.get_saved_plan(plan['planId']),plan)
        self.assertEqual(plan['variables']['mainGoals'][0]['incrementMinutes'],30)
    def test_saved_json_contains_templates_and_all_variables_not_api_key(self):
        plan=server.save_plan(self.expand())
        raw=(self.directory/(plan['planId']+'.json')).read_text(encoding='utf-8')
        stored=json.loads(raw)
        self.assertIn('aiTemplates',stored); self.assertIn('userInput',stored['variables'])
        self.assertIn('completionHistory',stored); self.assertNotIn('OPENROUTER_API_KEY',raw)
    def test_progress_uses_actual_total_preserves_past_and_no_ai(self):
        plan=server.save_plan(self.expand()); original_first=copy.deepcopy(plan['days'][0])
        with patch('server.request_ai') as request:
            updated=server.update_sidequest_progress(plan['planId'],'side-project',60,as_of_date=plan['days'][0]['date'])
            repeated=server.update_sidequest_progress(plan['planId'],'side-project',60,as_of_date=plan['days'][0]['date'])
            request.assert_not_called()
        self.assertEqual(updated['days'][0],original_first)
        state=repeated['variables']['sideQuests'][0]
        self.assertEqual(state['completedMinutes'],60); self.assertEqual(state['plannedMinutes'],540)
        self.assertEqual(updated['days'],repeated['days'])
        self.assertEqual(server.get_saved_plan(plan['planId']),repeated)
    def test_finished_flag_removes_only_future_side_tasks(self):
        plan=server.save_plan(self.expand())
        updated=server.update_sidequest_progress(plan['planId'],'side-project',30,completed=True,as_of_date=plan['days'][0]['date'])
        self.assertEqual(len(todos(updated,'side-project')),1)
        self.assertEqual(len(todos(updated,'main-learning')),30)
    def test_saved_plan_path_traversal_rejected(self):
        with self.assertRaises(ValueError): server.get_saved_plan('../../.env')
    def test_prompt_filled_and_asks_only_templates(self):
        prompt=server.build_prompt(sample_input(60))
        self.assertNotIn('{{journeyDays}}',prompt); self.assertIn('60-day journey',prompt)
        self.assertIn('day-one activity templates',prompt); self.assertIn('EVERY supplied main goal',prompt)
    def test_parser_handles_fences(self):
        raw=templates(sample_input()); envelope=response(raw)
        envelope['choices'][0]['message']['content']='```json\n'+json.dumps(raw)+'\n```'
        self.assertEqual(server.parse_ai_response(envelope),raw)
    @patch('server.test_api_connection',return_value=True)
    @patch('server.request_ai',side_effect=server.APIError(502,'unavailable'))
    def test_api_failure_not_saved(self, request, connection):
        with self.assertRaises(server.APIError): server.generate_plan(sample_input())
        self.assertFalse(list(self.directory.glob('*.json')))
    @patch('server.request_ai',return_value={'choices':[{'finish_reason':'stop','message':{'content':'OK'}}]})
    def test_connection_method_still_works(self, request):
        self.assertIs(server.test_api_connection(),True)
    @patch('server.test_api_connection',return_value=False)
    @patch('server.request_ai')
    def test_connection_failure_stops_plan_request(self, request, connection):
        with self.assertRaises(server.APIError): server.generate_plan(sample_input())
        request.assert_not_called()
    @patch('server.request_ai',side_effect=server.APIError(502,'offline'))
    def test_connection_returns_false(self, request):
        self.assertIs(server.test_api_connection(),False)
    def test_add_and_delete_goals_preserve_duration(self):
        data=sample_input(90); original=copy.deepcopy(data); goal={'goalId':'new','title':'New goal'}
        changed=server.add_main_goal(data,goal); changed=server.delete_main_goal(changed,'new')
        changed=server.add_sidequest(changed,goal); changed=server.delete_sidequest(changed,'new')
        self.assertEqual(changed,original); self.assertEqual(data,original)


class PrintPlanTests(IsolatedPlans):
    def test_prints_every_day_without_ai_and_preserves_water(self):
        data=sample_input(90)
        data['mainTasks'][0]['target'][0]['value']=7
        ai=templates(data)
        for template in ai['templates']:
            if template['goalId']=='main-exercise': template['title']='Workout'
            if template['goalId']=='main-hydration': template['title']='Drink water'
        plan=server.save_plan(server.expand_plan(data,ai))
        path=self.directory/(plan['planId']+'.json')
        original=path.read_bytes()
        stream=io.StringIO()
        with patch('server.request_ai') as request:
            text=server.print_all_daily_tasks(path,output=stream)
            request.assert_not_called()
        self.assertEqual(stream.getvalue(),text+'\n')
        for day in plan['days']:
            self.assertIn(f"Day {day['day']} ({day['date']})",text)
        sections=text.split('\n\n')
        self.assertEqual(len(sections),90)
        self.assertIn('- Workout: 30 minutes',sections[9])
        self.assertIn('- Workout: 60 minutes',sections[10])
        self.assertIn('- Workout: 270 minutes',sections[89])
        self.assertEqual(text.count('- Drink water: 2 liters'),90)
        self.assertEqual(path.read_bytes(),original)
    def test_empty_days_have_a_readable_bullet(self):
        path=self.directory/'empty.json'
        path.write_text(json.dumps({'days':[{'day':1,'date':'2026-10-12','todos':[]}]}),encoding='utf-8')
        text=server.print_all_daily_tasks(path,output=io.StringIO())
        self.assertEqual(text,'Day 1 (2026-10-12)\n- No tasks scheduled.')


class HTTPTests(IsolatedPlans):
    def request(self, path, body=None, headers=None, method=None):
        """Exercise HTTP parsing/routing without OS sockets (sandbox-safe)."""
        class MemorySocket:
            def __init__(self, incoming):
                self.incoming = incoming
                self.outgoing = bytearray()

            def makefile(self, *args):
                return io.BytesIO(self.incoming)

            def sendall(self, content):
                self.outgoing.extend(content)

        class QuietHandler(server.Handler):
            def log_message(self, *args):
                pass

        method = method or ("POST" if body is not None else "GET")
        request_headers = {"Host": "127.0.0.1:8000"}
        if body is not None:
            request_headers.update({"Content-Type": "application/json", "Content-Length": str(len(body))})
        request_headers.update(headers or {})
        wire = f"{method} {path} HTTP/1.0\r\n" + "".join(f"{key}: {value}\r\n" for key, value in request_headers.items()) + "\r\n"
        connection = MemorySocket(wire.encode() + (body or b""))
        QuietHandler(connection, ("127.0.0.1", 1234), object())
        response = HTTPResponse(MemorySocket(bytes(connection.outgoing)))
        response.begin()
        return response

    @patch('server.test_api_connection',return_value=True)
    @patch('server.request_ai')
    def test_generation_save_load_and_bullet_routes(self, request, connection):
        data=sample_input(); request.return_value=response(templates(data))
        with self.request('/api/roadmap',json.dumps(data).encode()) as result:
            self.assertEqual(result.status,200); plan=json.load(result)
            self.assertTrue(all('bullets' in d for d in plan['days']))
        with self.request('/api/plans/'+plan['planId']) as result: self.assertEqual(json.load(result),plan)
        with self.request('/api/daily-tasks',json.dumps({'plan':plan,'date':plan['days'][-1]['date']}).encode()) as result:
            day=json.load(result); self.assertEqual(day['day'],30); self.assertTrue(day['bullets'])
        self.assertEqual(request.call_count,1)
    @patch('server.test_api_connection',return_value=True)
    @patch('server.request_ai')
    def test_post_plans_returns_all_days_json_and_resource_location(self, request, connection):
        for length in (30,60,90):
            data=sample_input(length)
            request.return_value=response(templates(data))
            with self.request('/api/plans',json.dumps(data).encode()) as result:
                self.assertEqual(result.status,201)
                self.assertIn('application/json',result.getheader('Content-Type'))
                plan=json.load(result)
                location=result.getheader('Location')
                self.assertEqual(location,'/api/plans/'+plan['planId'])
                self.assertEqual(len(plan['days']),length)
                self.assertTrue(all(d['bullets']==server.tasks_to_bullets(d) for d in plan['days']))
            with self.request(location) as result:
                self.assertEqual(json.load(result),plan)
        self.assertEqual(connection.call_count,3)
        self.assertEqual(request.call_count,3)
    @patch('server.test_api_connection',return_value=False)
    @patch('server.request_ai')
    def test_post_plans_connection_failure_returns_json_error(self, request, connection):
        with self.request('/api/plans',json.dumps(sample_input()).encode()) as result:
            self.assertEqual(result.status,502)
            self.assertIn('error',json.load(result))
        request.assert_not_called()
    def test_post_plans_unreadable_json_returns_json_error(self):
        with self.request('/api/plans',b'{broken') as result:
            self.assertEqual(result.status,400)
            self.assertIn('error',json.load(result))
    @patch('server.request_ai')
    def test_progress_route_no_ai(self, request):
        data=sample_input(); plan=server.save_plan(server.expand_plan(data,templates(data)))
        body={'planId':plan['planId'],'goalId':'side-project','completedMinutes':600,'asOfDate':plan['days'][0]['date']}
        with self.request('/api/sidequest/progress',json.dumps(body).encode()) as result:
            updated=json.load(result); self.assertTrue(updated['variables']['sideQuests'][0]['budgetReached'])
        request.assert_not_called()
    def test_unknown_saved_plan_and_env_not_served(self):
        with self.request('/api/plans/00000000000000000000000000000000') as result: self.assertEqual(result.status,404)
        with self.request('/.env') as result: self.assertEqual(result.status,404)
    def test_ui_has_saved_plan_and_progress_controls(self):
        with self.request('/') as result:
            html=result.read(); self.assertIn(b'<option value="90">90 days</option>',html)
            self.assertIn(b'id="saveProgress"',html); self.assertIn(b'id="loadSaved"',html)


if __name__=='__main__':
    unittest.main(verbosity=2)
