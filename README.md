# local-AI-frontend
An opensource frontend for Ollama.
# Requirements: Ollama, Node.js, NPM. Ensure Node.js is added to PATH.
To run the application, open local-AI-frontend-main in terminal/command prompt and type "NPM install", then "NPM run dev" and open any browser and type the URL: localhost:3000  .
# Login not working?
Open browser console with F12 or right click >> inspect, click console, paste: window.onbeforeunload = function() { return "Stop"; };
Press enter. Then sign in, and press cancel when it asks if you want to reload the page. Alternatively, go to sources, press >> up by Page and Workspace, choose Snippets, and new snippet. paste the code into the code window and name the snippet. Use this for signing in.
