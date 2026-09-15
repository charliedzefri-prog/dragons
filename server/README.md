# Деплой на Render.com

1. Залей папку `dragonmania` в GitHub-репозиторий целиком (index.html, game.js, data.js, style.css, assets/, server/, render.yaml).
2. https://dashboard.render.com → **New → Blueprint** → выбери репозиторий. Render прочитает `render.yaml`
   (Web Service на Node, rootDir `server`, диск 1 ГБ для `db.json`, чтобы друзья и рейтинг переживали рестарты).
   Либо вручную: **New → Web Service**, Root Directory `server`, Build `npm install`, Start `npm start`.
3. После деплоя игра открывается по `https://<имя>.onrender.com` — WebSocket на том же хосте, клиент подключается сам.
4. Free-план засыпает через 15 минут без трафика; первый вход после сна ~30 с.

Локально: `cd server && npm install && npm start` → http://localhost:8000

Подключить клиент к другому серверу: в консоли браузера
`localStorage.setItem("dml_server","wss://<имя>.onrender.com")`.
