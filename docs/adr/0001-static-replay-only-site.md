# Static, replay-only site

The site is a static export with no server and no model calls: every episode it shows is a stored episode from the thesis, and re-running a cell is done in mt-ai-lab with the reader's own API key. Live re-runs would need a Python back end and paid API access per visitor, and would not reproduce the stored results (episodes at temperature 0 still diverge on some models), while the site's job is to show the evidence behind the thesis.
