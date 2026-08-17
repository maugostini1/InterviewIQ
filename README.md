## Key Features:

1. User Authentication
2. Mock Interview with Time Limit
3. AI Answer Evaluations
4. Progress Dashboard

## User Requirements:

+ Users shall be able to create an account
+ Users shall be able to log in and out.
+ Users shall be able to update target field.
+ Users shall be able to start a mock interview.
+ Users shall be able to stop the mock interview.
+ Users shall be able to type responses to AI-Generated Questions.
+ Users shall receive feedback on questions after the interview.
+ Users shall receive recommendations for improvement based on answers.
+ Users shall receive a score based on their answers.
+ Users shall be able to track progress on the dashboard.

** To run backend: python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
** To run Ollama: ollama run gemma3:latest
** To ensure expo run correct android emulator: npx expo run:android
