# WordFlow · CityU 实时互动词云

一个可直接运行、无需登录的现场互动词云：主持人在电脑上打开大屏，参与者用手机扫码作答，答案通过 SSE 实时汇聚成中文词云。项目内置 A/B 两套独立题目，并提供仅管理员可访问的手机内容审核后台。

| 词云 | 题目 | 题型 | 提交规则 |
| --- | --- | --- | --- |
| A | 初见CityU，你此刻的心情是？ | 多选 | 每个浏览器限答一次；“其他”限 1–6 字 |
| B | 来到CityU以后，我最没想到的是： | 单选 | 可重复提交；“其他”不设字数上限 |

## 界面预览

![WordFlow 主持人大屏：拼贴背景、实时词云、扫码参与和参与统计](./docs/images/wordflow-dashboard.png)

<p align="center"><sub>主持人大屏：实时词云、参与二维码、回答数和热门答案统计</sub></p>

## 项目特点

- 无需 Supabase、数据库账号或参与者登录。
- 主持人大屏与手机答题页分离，自动生成局域网参与二维码。
- 同一份代码可同时运行 A/B 两个词云；不同端口和 JSON 文件让数据完全隔离。
- A 提供 20 个预设心情选项并支持多选；B 提供 9 个预设选项并强制单选。
- A 的“其他”可输入 1–6 个 Unicode 字素；B 的“其他”使用不限字数的多行输入框。
- 相同答案自动合并，频次越高，词云字号越大。
- Server-Sent Events 实时更新；断线自动重连，并用轮询兜底。
- B 支持提交后点击“再填一个”继续作答。
- 回答保存在本地 JSON 文件中，重启服务不会丢失。
- 管理员密钥保护清空、屏蔽、恢复和永久删除操作。
- A/B 各有独立手机审核页；完整管理地址只在启动终端显示，不出现在公开网页。

## 界面与视觉样式

### 主持人大屏

| 区域 | 样式与行为 |
| --- | --- |
| 整体背景 | 使用 `docs/images/bg.png` 的纸张拼贴背景，并保留浅色加载回退 |
| 题目区 | 大字号深蓝题目，回答数与题目同一行 |
| 词云卡片 | 白色半透明毛玻璃面板、细描边、柔和阴影和浅色点阵 |
| 词云颜色 | 深红、紫、蓝、青绿、棕橙、靛蓝和玫红；色盘可在组件顶部直接修改 |
| 词频映射 | 高频词更大，使用平方根比例压缩极端差距，最多显示 80 个不同答案 |
| 排布方式 | 中文词保持水平排列，不随机旋转；悬停时增加亮度和发光 |
| 二维码区 | 右侧独立卡片，包含二维码、参与地址和复制按钮 |
| 统计区 | 展示参与人数、不同答案数量和热门词排行 |

### 手机参与页

<table>
  <tr>
    <td align="center" width="50%">
      <img src="./docs/images/7b597cdcdf8423aebaec853df70f241b.jpg" alt="WordFlow 手机答题选择页" width="360" />
      <br /><sub>手机答题选择页</sub>
    </td>
    <td align="center" width="50%">
      <img src="./docs/images/e9f9b80e1cd090c49c740d2675600d22.jpg" alt="WordFlow 手机提交成功与再填一个页面" width="360" />
      <br /><sub>提交成功与“再填一个”</sub>
    </td>
  </tr>
</table>

- 浅紫白渐变背景与毛玻璃卡片。
- A 使用圆角复选卡片，可同时选择多个答案。
- B 使用单列圆角单选卡片，一次只能选择一个答案。
- 选中后显示紫色边框、浅紫背景与勾选图标。
- A 选择“其他”后显示输入框及 `0/6` 字数计数；B 显示不限字数的多行输入框。
- B 提交成功后显示“再填一个”按钮。
- 适配小屏滚动，并在窄屏使用两列选项布局。

### 手机审核页

<p align="center">
  <img src="./docs/images/c4fffc0676c1f03451aa8499549db8a5.jpg" alt="WordFlow 手机审核后台：搜索、屏蔽、恢复和永久删除" width="420" />
  <br /><sub>仅管理员可访问的手机内容审核后台</sub>
</p>

- 按最新提交顺序浏览和搜索答案。
- 屏蔽后答案立即从词云、排行和公开计数中移除，可随时恢复。
- 永久删除需要二次确认且不可恢复。
- 未持有正确 `ADMIN_KEY` 时无法读取或操作审核记录。

全局样式位于 [`src/index.css`](./src/index.css)，词云颜色和字号规则位于 [`src/components/WordCloudVisualization.jsx`](./src/components/WordCloudVisualization.jsx)。

## 系统如何工作

```mermaid
flowchart LR
    A["手机 /join"] -->|"POST 单选或多选答案"| B["A 或 B Node.js 服务"]
    M["管理员手机 /moderate"] -->|"屏蔽 / 恢复 / 删除"| B
    B -->|"原子写入"| C["独立 JSON 数据文件"]
    B -->|"SSE 实时推送"| D["主持人大屏 /"]
    D --> E["React + d3-cloud 词云"]
```

| 层级 | 技术 | 说明 |
| --- | --- | --- |
| 前端 | React 18 + Vite | 主持人大屏、手机答题页、手机审核页和开发热更新 |
| 词云 | d3-cloud | 根据词频计算字号与排布 |
| 二维码 | qrcode.react | 生成局域网或公网参与地址 |
| 后端 | Node.js HTTP Server | REST API、SSE、静态资源与主持人权限 |
| 存储 | JSON 文件 | 默认保存到 `data/wordcloud.json` |

开发环境中，`server.mjs` 将 Vite 作为中间件加载；生产环境中，同一个 Node.js 进程同时提供 `dist` 前端文件和 API。因此不需要分别启动两个终端。

## 快速开始

### 1. 环境要求

- Node.js 18 或更高版本，推荐 Node.js 20/22 LTS。
- npm。
- 局域网扫码时，电脑和手机连接同一个 Wi-Fi。

```bash
node --version
npm --version
```

### 2. 安装并配置

```bash
cd /Users/fluffywood/projects/wordcloud/coding-challenge-word-cloud
cp .env.example .env
npm install
```

### 3. 启动默认词云 A

```bash
npm run dev
```

也可以运行一键脚本：

```bash
./init.sh
```

启动成功后终端会显示：

```text
WordFlow 已启动
主持人大屏: http://localhost:5173/?admin=...
手机参与页: http://192.168.x.x:5173/join
手机审核页（仅管理员）: http://192.168.x.x:5173/moderate?admin=...
数据文件: .../data/wordcloud.json
```

### 4. 同时启动词云 A 和 B

分别打开两个终端。词云 A 保留原有数据：

```bash
cd /Users/fluffywood/projects/wordcloud/coding-challenge-word-cloud
PORT=5173 WORDCLOUD_DATA_FILE=/Users/fluffywood/projects/wordcloud/coding-challenge-word-cloud/data/wordcloud.json npm run dev
```

词云 B 使用独立端口、题目和数据文件：

```bash
cd /Users/fluffywood/projects/wordcloud/coding-challenge-word-cloud
POLL_VARIANT=b PORT=5174 WORDCLOUD_DATA_FILE=/Users/fluffywood/projects/wordcloud/coding-challenge-word-cloud/data/cloud-b/wordcloud.json npm run dev
```

两个终端必须保持运行。手机和电脑连接同一网络后，各自的参与页、二维码、审核页和数据记录互不影响。

### 5. 页面地址

| 地址 | 用途 |
| --- | --- |
| `http://localhost:5173/?admin=...` | 主持人大屏；首次请使用终端输出的完整地址 |
| `http://localhost:5173/` | 普通大屏查看地址 |
| `http://192.168.x.x:5173/join` | 手机参与页，也是二维码内容 |
| 终端打印的 `/moderate?admin=...` 完整地址 | 仅管理员使用的手机审核页；公开网页没有入口 |
| `/api/health` | 服务健康检查 |

按 `Ctrl+C` 可以停止服务。

## 完整前后端配置

### 前端配置

主要文件：

```text
src/
├── App.jsx                              # 根据 /、/join、/moderate 切换页面
├── config/pollConfig.js                # A/B 题目、选项、题型和“其他”限制
├── components/HostView.jsx             # 主持人大屏
├── components/ParticipantView.jsx      # 手机单选/多选答题页
├── components/ModerationView.jsx       # 私有手机内容审核页
├── components/WordCloudVisualization.jsx
├── hooks/useLivePoll.js                # API、SSE 与重连
├── hooks/useModeration.js              # 管理员密钥、审核查询与操作
└── index.css                           # 桌面与手机样式
```

题目、题型、选项和“其他”字数上限统一放在 `src/config/pollConfig.js`。当前配置：

| 配置 | A | B |
| --- | --- | --- |
| 题目 | 初见CityU，你此刻的心情是？ | 来到CityU以后，我最没想到的是： |
| 题型 | 多选 | 单选 |
| 重复提交 | 不允许 | 允许，可点击“再填一个” |
| “其他”限制 | 1–6 个字 | 不设字数上限 |

词云 A 选项：

> 期待、兴奋、好奇、开心、激动、新鲜、憧憬、充满希望、自信、放松、紧张、忐忑、迷茫、陌生、不安、压力、挑战、归属感、幸运、充实、其他。

词云 B 选项：

> 坡比想象中多、每天要走这么多路、晚课结束得这么晚、这么快就迎来DDL、活动可以有这么多、图书馆座位比双十一还难抢、教室冷的像冰窖、找教室全靠缘分、成为熬夜冠军、其他。

`POLL_VERSION` 标记持久化结构版本。修改数据结构时应升级该值；仅修改文案或选项时无需升级。修改共享配置或 `server.mjs` 后请重启开发服务；生产环境还需要重新构建。

前端请求同源 `/api/*`，不需要配置 `VITE_API_URL`。

### 后端配置

服务会自动读取项目根目录的 `.env`：

```env
PORT=5173
HOST=0.0.0.0

# 第二个词云使用 B 题目；原词云不设置或填写 a
# POLL_VARIANT=b

# 公网部署时填写来源地址，不要包含 /join
# PUBLIC_URL=https://wordflow.example.com

# 公网部署时强烈建议显式设置
# ADMIN_KEY=replace-with-a-long-random-string

# WORDCLOUD_DATA_FILE=/app/data/wordcloud.json
# MAX_RESPONSES=2000
# MAX_SSE_CLIENTS=500
```

| 变量 | 默认值 | 作用 |
| --- | --- | --- |
| `PORT` | `5173` | Node.js 与 Vite 共用的服务端口 |
| `HOST` | `0.0.0.0` | 监听所有网卡；局域网扫码需要此配置 |
| `POLL_VARIANT` | `a` | 题目配置；设为 `b` 时使用“来到 CityU 以后”单选题，允许不限字数的“其他”答案和重复提交 |
| `PUBLIC_URL` | 自动推断 | 二维码使用的公网或局域网来源地址，不带 `/join` |
| `ADMIN_KEY` | 自动生成 | 保护清空答案操作 |
| `WORDCLOUD_DATA_FILE` | `./data/wordcloud.json` | 回答持久化文件，所在目录必须可写 |
| `MAX_RESPONSES` | `2000` | 单轮最多回答份数 |
| `MAX_SSE_CLIENTS` | `500` | 最大同时 SSE 连接数 |

未设置 `ADMIN_KEY` 时，服务会生成随机密钥并保存到数据目录中的 `.admin-key`。首次打开终端输出的 `/?admin=...` 地址后，密钥会保存在该浏览器中，并自动从地址栏移除。

不要公开 `.admin-key` 或带 `?admin=` 的主持人地址。

### 手机内容审核

每个服务启动后，会在终端额外打印仅管理员使用的手机审核地址。审核入口不会显示在主持人大屏或参与者页面上。

- A、B 使用不同端口和数据目录，因此各自拥有独立的审核页面和管理员密钥。
- 第一次在手机打开终端中的审核地址后，密钥会保存在该端口对应的浏览器存储中，并立即从地址栏移除。
- 审核页面可搜索提交记录、屏蔽违规内容、恢复误屏蔽内容或永久删除单条记录。
- 屏蔽、恢复和删除会立即更新对应主持端的词云、排行与回答计数。
- 不要转发终端中的审核地址；公网使用时应启用 HTTPS 并显式设置高强度 `ADMIN_KEY`。

### API 接口

| 方法 | 地址 | 说明 |
| --- | --- | --- |
| `GET` | `/api/health` | 健康检查和当前回答数 |
| `GET` | `/api/state?sessionId=...` | 获取问题、公开回答、个人提交状态和参与链接 |
| `GET` | `/api/events?sessionId=...` | SSE 实时状态流 |
| `POST` | `/api/responses` | 提交一份单选或多选回答 |
| `DELETE` | `/api/responses` | 清空回答，需要 `X-Admin-Key` |
| `GET` | `/api/admin/responses` | 获取审核记录，需要 `X-Admin-Key` |
| `PATCH` | `/api/admin/responses/:id` | 屏蔽或恢复单条记录，需要 `X-Admin-Key` |
| `DELETE` | `/api/admin/responses/:id` | 永久删除单条记录，需要 `X-Admin-Key` |

提交格式示例：

```json
{
  "questionId": "current-question-id",
  "sessionId": "unique-participant-id",
  "selectedOptions": ["期待", "兴奋", "其他"],
  "otherText": "惊喜"
}
```

服务端会验证选项白名单、选择数量、重复项和问题 ID。A 配置为多选、限制每人提交一次且“其他”为 1–6 字；B 配置为单选、允许重复提交且“其他”不设字数上限。

### 数据持久化

默认数据文件：

```text
data/wordcloud.json
```

每次提交对应一条 response，选中的词保存在 `answers[]` 中；B 允许同一会话拥有多条 response。屏蔽状态也保存在记录中。数据通过临时文件和原子替换写入。请确保 Node.js 进程对数据目录有写权限；容器或云端部署必须挂载持久化磁盘。

## 现场使用方法

1. 主持人在电脑上启动 A，或分别启动 A/B 两个服务。
2. 打开终端打印的完整“主持人大屏”地址。
3. 将浏览器切换为全屏，并投影或共享到会场大屏。
4. 确保电脑和手机连接同一个 Wi-Fi。
5. 参与者扫描对应大屏二维码；A 可多选，B 为单选。
6. 选择“其他”时，A 输入 1–6 个字，B 可自由填写。
7. 提交后，大屏词云、回答数和排行榜会自动更新。
8. 管理员可用终端打印的手机审核页屏蔽、恢复或永久删除单条记录。
9. 活动结束或需要重新演示时，点击词云底部的“清空答案”。

### 答题与计数规则

- A 中一位参与者的一次多选计为 1 份回答；B 中每次单选提交计为 1 份回答。
- 每个被选中的词分别增加一次词频。
- A 中同一浏览器每轮只能提交一次；B 可以通过“再填一个”重复提交。
- “其他”输入会直接作为词云词语，不会显示成字面上的“其他”。

## 生成 100 份随机回答

先保持 WordFlow 服务正在运行，再打开另一个终端：

```bash
cd /Users/fluffywood/projects/wordcloud/coding-challenge-word-cloud
npm run seed-demo -- 100
```

脚本会：

- 生成 100 个唯一参与者会话。
- 自动识别题型：A 每份随机选择 1–3 个词，B 每份只选择 1 个答案。
- 使用有高低差异的权重，让热门词形成明显字号层级。
- 随机加入“惊喜”“温暖”“感动”等自定义词。
- 通过真实 API 分批并发提交，触发正常的数据保存与实时推送。
- 完成后校验实际新增数量。

数量参数支持 1–1000。例如增加 300 份：

```bash
npm run seed-demo -- 300
```

该命令会在现有数据上**追加**，不会覆盖或自动清空。若需要恰好查看 100 份的效果，请先在主持人页面清空现有答案。

服务使用其他端口或主机时：

```bash
WORDFLOW_ORIGIN=http://127.0.0.1:5174 npm run seed-demo -- 100
```

压力测试可通过 `SEED_CONCURRENCY` 调整并发数，范围为 1–100，默认值为 20：

```bash
SEED_CONCURRENCY=30 WORDFLOW_ORIGIN=http://127.0.0.1:5174 npm run seed-demo -- 1000
```

Windows PowerShell：

```powershell
$env:WORDFLOW_ORIGIN="http://127.0.0.1:5174"
npm run seed-demo -- 100
```

## 生产环境部署

### 方式一：Node.js

```bash
npm ci
npm run build
npm start
```

生产环境建议至少配置：

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=5173
ADMIN_KEY=replace-with-a-long-random-string
PUBLIC_URL=https://wordflow.example.com
WORDCLOUD_DATA_FILE=/absolute/persistent/path/wordcloud.json
```

### 方式二：Docker

构建镜像：

```bash
docker build -t wordflow .
```

运行并挂载持久化数据卷：

```bash
docker run -d \
  --name wordflow \
  --restart unless-stopped \
  -p 5173:5173 \
  -e PUBLIC_URL=https://wordflow.example.com \
  -e ADMIN_KEY=replace-with-a-long-random-string \
  -v wordflow-data:/app/data \
  wordflow
```

查看启动地址和日志：

```bash
docker logs -f wordflow
```

### Nginx 反向代理示例

```nginx
server {
    listen 80;
    server_name wordflow.example.com;

    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE 实时推送需要关闭代理缓冲
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 1h;
    }
}
```

公网环境请配置 HTTPS，并将 `PUBLIC_URL` 设置为最终 `https://` 来源地址。

### 部署限制

- 需要常驻 Node.js 进程和可写持久化磁盘，不能部署到纯静态 GitHub Pages。
- JSON 文件方案只支持单实例或单 worker；多实例部署需要共享数据库和消息系统。
- 反向代理必须关闭 SSE 缓冲并增加读取超时。
- 公网部署必须使用 HTTPS、强 `ADMIN_KEY` 和持久化数据卷。
- 参与者填写的内容会公开展示，请勿提交个人敏感信息。

## 测试与验证

```bash
npm run lint
npm run build
npm test
```

`npm test` 会验证 A/B 两套题目与题型、B 的重复提交、“其他”限制、SSE、管理员审核权限和 JSON 持久化。

健康检查：

```bash
curl -fsS http://127.0.0.1:5173/api/health
```

预期返回类似：

```json
{"ok":true,"responses":100}
```

## 项目命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动开发服务：前端热更新＋后端 API |
| `npm run build` | 构建生产前端 |
| `npm start` | 运行生产服务 |
| `npm run preview` | 本地预览生产构建 |
| `npm run seed-demo -- 100` | 通过 API 追加 100 份随机回答 |
| `npm run lint` | 执行 ESLint |
| `npm test` | 构建并运行端到端冒烟测试 |

## 项目结构

```text
coding-challenge-word-cloud/
├── data/                       # 回答数据与自动生成的主持人密钥
├── docs/images/                # README 界面截图
├── scripts/
│   ├── seed-demo.mjs           # 随机演示回答生成器
│   └── smoke-test.mjs          # API/SSE/持久化冒烟测试
├── src/                        # React 前端与前后端共享配置
├── .env.example                # 环境变量模板
├── Dockerfile                  # 两阶段生产镜像
├── init.sh                     # 本地一键启动
├── server.mjs                  # Node API、SSE 和静态文件服务
└── package.json
```

## 常见问题

### 5173 端口被占用

查看占用进程：

```bash
lsof -nP -iTCP:5173 -sTCP:LISTEN
```

确认是旧的 WordFlow 服务后优雅停止：

```bash
kill -TERM <PID>
```

也可以改用其他端口：

```bash
PORT=5174 npm run dev
```

### 手机扫码后无法打开

- 手机不能访问电脑的 `localhost`，应使用类似 `192.168.x.x` 的地址。
- 确认电脑和手机位于同一个 Wi-Fi。
- 允许 Node.js 通过 macOS/Windows 防火墙。
- 访客 Wi-Fi 可能开启客户端隔离，可换用普通 Wi-Fi 或手机热点。
- VPN 或多网卡可能导致自动选择错误 IP；可在 `.env` 中设置 `PUBLIC_URL`。

### 页面只显示背景、没有界面内容

1. 停止旧的 Vite/Node.js 进程。
2. 在项目根目录重新执行 `npm install`。
3. 执行 `npm run dev`。
4. 打开终端本次打印的地址并强制刷新浏览器。

### 二维码地址不正确

在 `.env` 中指定可访问的根地址，不要包含 `/join`：

```env
PUBLIC_URL=http://192.168.1.20:5173
```

### 清空答案时提示主持人密钥错误

重新打开本次启动时终端打印的完整 `/?admin=...` 地址。如果更换了 `ADMIN_KEY`，旧浏览器中保存的密钥也需要用新地址覆盖。

## 数据与授权说明

- `.admin-key` 和回答数据不应提交到公开仓库。
- “每个浏览器限答一次”用于现场体验，并非严格防作弊机制；清除浏览器数据或更换设备可以再次参与。
- 公开发布仓库前，请确认根目录中有适合使用场景的 `LICENSE`，并核对上游项目授权条款。
