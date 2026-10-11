# Create a journey plan

Start the server from this folder with `py server.py`.

POST http://127.0.0.1:8000/api/plans
Content-Type: application/json

Send the user input directly as the JSON body. See test-request.json for the
complete input example: journeyDays (30, 60, 90), startDate (YYYY-MM-DD),
mainTasks (list of goal objects), sideQuests (list of goal objects).
The old progression field is ignored; active main goals add 30 minutes every
10 calendar days. Water stays at the selected amount, capped at 2 liters.

PowerShell, using the included sample:

```powershell
$inputJson = Get-Content .\test-request.json -Raw
$plan = Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/api/plans -ContentType 'application/json' -Body $inputJson
$plan.days | Select-Object day, date, bullets
```

Browser JavaScript:

```javascript
const response = await fetch('/api/plans', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify(userInput)
});
const plan = await response.json();
if (!response.ok) throw new Error(plan.error);
for (const day of plan.days) {
  console.log(`Day ${day.day} (${day.date})`);
  for (const task of day.bullets) console.log(`- ${task}`);
}
```

Success: 201 Created, Location: /api/plans/<planId>.
Response is the full saved plan JSON: planId, days, variables, aiTemplates,
completionHistory and warnings. Every day contains day, date, todos,
totalActiveMinutes and bullets (list of strings).

The server checks connectivity, requests only starting activity templates
from AI, then generates all journey days locally. Bullet printing or loading
a saved plan does not make another AI request. Side quests retain their daily
allocation until their deadline, finished flag or remaining hour budget.

GET /api/plans/<planId> retrieves the JSON plan later.
POST /api/roadmap remains available for the existing webpage (200 response).
Errors are JSON objects with an error string; 400 indicates unreadable input,
502 an AI connection/response failure, and 429 an AI rate limit from the planning
request. Business validation remains outside this server.
