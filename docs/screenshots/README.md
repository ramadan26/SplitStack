# Screenshot checklist

Capture at **375px width** (iPhone SE) using Chrome DevTools device mode,
signed in as `alex@demo.com` / `demo1234`. Save as PNG with these exact
filenames so the main README renders them:

| File | What to capture |
| ---- | --------------- |
| `login.png` | `/login` — demo sign-in form |
| `home.png` | `/home` — group cards with balances |
| `group.png` | `/groups/<trip-to-dubai>` — balances + expenses |
| `add-expense.png` | `/groups/<id>/expenses/new` — split mode UI |
| `settle.png` | `/groups/<id>/settle` — suggested payments |
| `dashboard.png` | `/dashboard` — cards + both charts |
| `dark.png` | home with dark mode enabled |
| `arabic.png` | group dashboard in Arabic (RTL) via the ع switcher |
| `demo.gif` | ~15s flow: login → open group → add expense → settle up (use ScreenToGif / Kap / `ffmpeg`) |

Tip: `ffmpeg -i input.mov -vf "fps=12,scale=375:-1:flags=lanczos" -loop 0 docs/screenshots/demo.gif`
