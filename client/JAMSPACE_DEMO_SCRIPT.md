# JamSpace — 3-Minute Demo Video Script

Two presenters (**Host A** and **Host B**), two screens recorded simultaneously. Demo song: **"Twinkle Twinkle Little Star"**, built live and collaboratively.

---

## [0:00 – 0:25] INTRODUCTION

**Host A:** "Hi everyone! We're excited to show you JamSpace — a real-time multiplayer music sequencer where multiple people can produce a track together, live, from anywhere in the world."

**Host B:** "JamSpace turns music-making into a shared, collaborative experience — like Google Docs, but for beats."

*[Action: Show the landing page — animated EQ bars, floating music notes, the JamSpace logo.]*

---

## [0:25 – 1:15] BACKEND — POWERED BY SPACETIMEDB

**Host A:** "Everything you're about to see is powered entirely by SpacetimeDB — a database that runs your backend logic AND keeps every client in sync in real time, with no extra server and no custom networking code to write."

*[Action: Open `server/src/lib.rs`, scroll to the "Tables" section, lines 5–63.]*

**Host B:** "Our whole data model lives in one Rust file — six tables: `Session`, `Track`, `Pattern`, `ArrangementBlock`, `Note`, and `UserPresence`. Each one is marked `public`, which means SpacetimeDB automatically replicates every row to every connected client — that's our entire real-time-sync layer, declared with a single attribute."

*[Action: Briefly point at each `#[table(...)]` struct — lines 6, 17, 28, 37, 45, 57 — then highlight the `public` keyword on line 44.]*

**Host A:** "Every action — adding a note, muting a track — runs through a 'reducer': a Rust function marked `#[reducer]` that updates the database. Here's `add_note` — it checks there isn't already a note at that spot, then inserts a new row into the `note` table, including the `duration` field."

*[Action: Scroll to the `add_note` reducer, lines 230–241, and briefly walk through it.]*

**Host B:** "On the client, we connect and subscribe to exactly the tables we need with SQL-like queries. From there, every insert and update streams to us over a WebSocket automatically — we just register a callback like `onInsert`, and React updates itself. The moment I add a note, it appears on Host A's screen instantly — typically in well under 100 milliseconds, with zero custom networking code."

*[Action: Show `SUBSCRIBE_QUERIES` in `client/src/App.tsx` (lines 7–14) and the `c.db.note.onInsert(...)` callback (around line 93).]*

**Host A:** "And shipping a backend change is just one command — `spacetime publish` — which compiles our Rust module to WebAssembly and deploys it live. That's our entire backend pipeline."

*[Action: Quick terminal shot running `spacetime publish --yes jamspace` from the `server/` directory.]*

---

## [1:15 – 3:00] FRONTEND — LIVE COLLABORATION DEMO

**Host B:** "Let's see it in action — we're going to write 'Twinkle Twinkle Little Star' together, live, from two different computers."

**Host A:** "I'll create a new project called 'Twinkle Twinkle'..."
*[Action: Type the project name, click "Create & Join."]*

**Host B:** "...and I'll join the same session from my computer."
*[Action: Host B sees the new session appear in the list in real time and clicks "Join."]*

**Host A:** "Notice we both show up as online collaborators in the top bar — you can see exactly who's here, each with their own color."
*[Action: Point to the user avatars in the transport bar.]*

**Host B:** "Let's start with drums. I'll select the Drums track and tap out a simple kick-and-snare pattern on the drum grid."
*[Action: Host B clicks pads on the drum grid to build a beat.]*

**Host A:** "And I'll add the melody. I can click and drag across the grid to make notes longer, perfect for holding out the long notes in 'Twinkle Twinkle'."
*[Action: Host A drags across cells on the synth/lead track to create held notes for "Twin-kle, twin-kle, lit-tle star."]*

**Host B:** "Watch — the moment Host A places a note, it appears on my screen instantly, in their own color, with a tooltip showing exactly who created it."
*[Action: Zoom in on the note appearing live, with creator color and tooltip.]*

**Host A:** "Now let's round it out with a bass line."
*[Action: Add a Bass track, place notes — showcase the new duration-aware bass synthesis sustaining through long notes.]*

**Host B:** "We can also manage our tracks on the fly — mute them, adjust volume, even add or remove instruments."
*[Action: Toggle mute, drag a volume slider, click "+ Add Track."]*

**Host A:** "Let's hit play and hear it together, fully in sync."
*[Action: Click the play button — both screens show a synced playhead and play the same audio together.]*

**Host B:** "JamSpace also supports two playback modes — Sync mode, where everyone hears the same thing together, and Personal mode, where you can practice your own part privately, with your own volume mix, without affecting anyone else."
*[Action: Toggle the playback-mode button; show that local volume changes in Personal mode don't affect the other host.]*

**Host A:** "We can change the tempo and time signature on the fly..."
*[Action: Type a new BPM value, open the time-signature dropdown and pick a new one.]*

**Host B:** "...extend the song by adding more bars to our pattern..."
*[Action: Click the "+ Bar" button and show the grid extending.]*

**Host A:** "And if you're ever short on inspiration, JamSpace ships with built-in demo patterns inspired by iconic songs — Classic Rock, Trap Beat, and Lo-Fi Chill — ready to load and remix instantly."
*[Action: Open the Demo menu, select a demo pattern, show it populate the grid.]*

**Host B:** "When we're done, we can head back to the home screen and jump into — or start — any other project."
*[Action: Click "← Home," show the session list including the new "Twinkle Twinkle" project.]*

**Host A:** "That's JamSpace — real-time, collaborative music-making, powered end-to-end by SpacetimeDB. Thanks for watching!"

*[Action: Final shot — both screens playing the finished "Twinkle Twinkle" track together.]*

---

## 📂 CODE REFERENCE GUIDE — where to find what's on screen

All paths are relative to `/Users/christine/Documents/GitHub/spacetimeDB/`.

| Script moment | What to show | File & location |
|---|---|---|
| "Our entire data model lives in one Rust file… six tables" | `Session`, `Track`, `Pattern`, `ArrangementBlock`, `Note`, `UserPresence` struct definitions | `server/src/lib.rs`, lines **5–63** (Session: 6, Track: 17, Pattern: 28, ArrangementBlock: 37, **Note: 45** — note the new `duration: u16` field on line 52, UserPresence: 57) |
| "Every table is marked `public`…" | The `#[table(name = note, public)]` attribute | `server/src/lib.rs`, line **44** |
| "…through 'reducers'… `add_note`" | The `add_note` reducer (validates + inserts a `Note` row, now with `duration`) | `server/src/lib.rs`, lines **230–241** |
| "We connect with `buildConnection`…" | WebSocket connection setup | `client/src/spacetime/client.ts`, function `buildConnection` (line **33**) |
| "…subscribe to exactly the tables we care about" | `SUBSCRIBE_QUERIES` array + `subscriptionBuilder().onApplied(...).subscribe(...)` | `client/src/App.tsx`, lines **7–14** and **121–131** |
| "…we just register callbacks like `onInsert`…" | `c.db.note.onInsert(...)` real-time callback | `client/src/App.tsx`, lines **93–99** |
| "…one command: `spacetime publish`" | Terminal — run from the server folder | `cd server/` then `spacetime publish --yes jamspace` |
| (If you also want to show codegen) | Regenerating TypeScript bindings after a schema change | `cd server/` then `spacetime generate --lang typescript --out-dir ../client/src/module_bindings --module-path .` |

### Frontend feature → component map (for your own reference while rehearsing)

| Feature in script | Component file |
|---|---|
| Landing page / project list / create project | `client/src/components/JoinModal.tsx` |
| Top transport bar (play, BPM, time sig, online users, mode toggle, back button) | `client/src/components/PlaybackControls.tsx` |
| Drum grid (tap-to-toggle pads) | `client/src/components/DrumGrid.tsx` |
| Melodic grid — **drag-to-create notes with duration** | `client/src/components/StepGrid.tsx` |
| Track headers (mute, volume, owner, remove) | `client/src/components/TrackHeader.tsx` |
| Beat ruler / bars / "+ Bar" button | `client/src/components/BeatRuler.tsx` |
| Overall session layout, playback wiring, demo loader | `client/src/components/SessionView.tsx` |
| Demo patterns (Classic Rock / Trap Beat / Lo-Fi Chill) | `client/src/audio/demos.ts` |
| Audio synthesis (drums, bass, samplers, note duration playback) | `client/src/audio/instruments.ts` |
| Playback scheduler (steps notes, applies duration in seconds) | `client/src/audio/scheduler.ts` |

# JamSpace — 3 分钟演示视频脚本（中文翻译）

两位主持人（**主持人 A** 和 **主持人 B**），同时录制两个人的电脑屏幕。演示曲目：**《小星星》（Twinkle Twinkle Little Star）**，现场协作完成。

---

## [0:00 – 0:25] 项目介绍

**主持人 A：** "大家好！我们非常激动地向大家展示 JamSpace —— 一款实时多人音乐编曲软件，让来自世界各地的人可以在线上一起实时创作一首曲子。"

**主持人 B：** "JamSpace 把音乐创作变成了一种共享、协作的体验 —— 就像 Google Docs，但用来做音乐。"

*【画面动作：展示落地页 —— 动态 EQ 音柱动画、漂浮的音符、JamSpace 的 logo。】*

---

## [0:25 – 1:15] 后端 —— 由 SpacetimeDB 驱动

**主持人 A：** "你接下来看到的一切，完全是由 SpacetimeDB 驱动的 —— 它是一个数据库，既能运行你的后端逻辑，又能让所有客户端实时保持同步，不需要额外搭建服务器，也不需要自己写任何网络同步代码。"

*【画面动作：打开 `server/src/lib.rs`，滚动到 "Tables" 部分，第 5–63 行。】*

**主持人 B：** "我们整个数据模型都写在一个 Rust 文件里 —— 一共六张表：`Session`、`Track`、`Pattern`、`ArrangementBlock`、`Note`、`UserPresence`。每一张都标记为 `public`，这意味着 SpacetimeDB 会自动把每一行数据同步到所有连接的客户端 —— 整个『实时同步』机制，就是靠这一个属性标记搞定的。"

*【画面动作：依次指向六个 `#[table(...)]` 结构体（第 6、17、28、37、45、57 行），再高亮第 44 行的 `public` 关键字。】*

**主持人 A：** "每一个操作 —— 添加音符、改变速度、静音音轨 —— 都通过『reducer』来完成：一种用 `#[reducer]` 标记的 Rust 函数，能原子化地更新数据库。比如这个 `add_note`：它会先检查这个位置是否已经有音符，然后把新的一行数据 —— 包括我们刚上线的 `duration` 字段 —— 直接插入到 `note` 表里。"

*【画面动作：滚动到 `add_note` reducer，第 230–241 行，简单讲解一下。】*

**主持人 B：** "在客户端这边，我们用类似 SQL 的查询语句，精确订阅自己需要的那几张表。从那以后，这些表上的每一次插入、更新都会自动通过 WebSocket 实时推送给我们 —— 我们只需要注册像 `onInsert` 这样的回调函数，React 的状态就会自动更新。我一添加音符，它就立刻出现在主持人 A 的屏幕上 —— 通常不到 100 毫秒，而且完全不需要写任何网络同步代码。"

*【画面动作：展示 `client/src/App.tsx` 中的 `SUBSCRIBE_QUERIES` 数组（第 7–14 行）以及 `c.db.note.onInsert(...)` 回调（约第 93 行）。】*

**主持人 A：** "而部署后端改动只需要一条命令 —— `spacetime publish` —— 它会把我们的 Rust 模块编译成 WebAssembly 并立即上线。这就是我们整个后端的部署流程。"

*【画面动作：快速展示在 `server/` 目录下执行 `spacetime publish --yes jamspace` 的终端画面。】*

---

## [1:15 – 3:00] 前端功能 —— 实时协作演示

**主持人 B：** "让我们实际操作一下 —— 我们将在两台不同的电脑上，现场一起合作完成《小星星》这首曲子。"

**主持人 A：** "我先创建一个名为 'Twinkle Twinkle' 的新项目……"
*【画面动作：输入项目名称，点击 "Create & Join"。】*

**主持人 B：** "……然后我从我的电脑上加入同一个会话。"
*【画面动作：主持人 B 实时看到新会话出现在列表中，点击 "Join"。】*

**主持人 A：** "可以看到我们俩都作为在线协作者出现在顶部工具栏 —— 每个人都有自己专属的颜色，一目了然。"
*【画面动作：指向工具栏中的用户头像。】*

**主持人 B：** "我们先从鼓点开始。我选中 Drums 音轨，在鼓机网格上敲出一个简单的底鼓加军鼓节奏。"
*【画面动作：主持人 B 在鼓机网格上点击打出节奏。】*

**主持人 A：** "我来加旋律。JamSpace 刚刚上线了音符时长功能 —— 我可以在网格上点击并拖动，让音符变长，正好可以用来表现《小星星》里那些长音。"
*【画面动作：主持人 A 在 synth/lead 音轨上拖动制作出 "一闪一闪亮晶晶" 的长音符。】*

**主持人 B：** "看，主持人 A 刚放下音符的瞬间，它就实时出现在我的屏幕上，用她专属的颜色显示，鼠标悬停还能看到是谁创建的。"
*【画面动作：放大展示音符实时出现，显示创建者颜色和提示信息。】*

**主持人 A：** "现在我们再加一条贝斯线，让曲子更丰满。"
*【画面动作：添加 Bass 音轨并放置音符 —— 展示新的、能感知时长的贝斯合成音色，在长音符上能持续发声。】*

**主持人 B：** "我们也可以随时管理音轨 —— 静音、调节音量，甚至添加或删除乐器。"
*【画面动作：切换静音、拖动音量滑块、点击 "+ Add Track"。】*

**主持人 A：** "现在让我们一起按下播放键，同步听一听效果。"
*【画面动作：点击播放按钮 —— 两个屏幕显示同步的播放头，同时播放相同的音频。】*

**主持人 B：** "JamSpace 还支持两种播放模式 —— 同步模式下，所有人听到的内容完全一致；个人模式下，你可以用自己的音量比例私下练习自己的声部，而不会影响到其他人。"
*【画面动作：切换播放模式按钮；展示个人模式下调整本地音量不会影响对方。】*

**主持人 A：** "我们还可以随时调整速度（BPM）和拍号……"
*【画面动作：手动输入新的 BPM 数值，打开拍号下拉菜单并选择新的拍号。】*

**主持人 B：** "……还可以给我们的曲子添加更多小节，让它更长……"
*【画面动作：点击 "+ Bar" 按钮，展示网格随之延长。】*

**主持人 A：** "如果一时没有灵感，JamSpace 还内置了多种风格的示例曲目 —— 摇滚经典、Trap 节奏、Lo-Fi 慢节奏 —— 一键加载即可直接改编创作。"
*【画面动作：打开 Demo 菜单，选择一个示例模式，展示它自动填满网格。】*

**主持人 B：** "做完之后，我们可以随时返回主页，进入 —— 或者创建 —— 任何其他项目。"
*【画面动作：点击 "← Home"，展示会话列表中包含刚创建的 'Twinkle Twinkle' 项目。】*

**主持人 A：** "这就是 JamSpace —— 由 SpacetimeDB 端到端驱动的实时协作音乐创作平台。感谢大家观看！"

*【画面动作：结尾画面 —— 两个屏幕一起播放完成的《小星星》曲目。】*

---

## 📂 代码对照表 —— 屏幕上展示的内容分别在哪个文件里

以下路径均相对于 `/Users/christine/Documents/GitHub/spacetimeDB/`。

| 脚本中的内容 | 展示什么 | 文件位置 |
|---|---|---|
| "我们整个数据模型都写在一个 Rust 文件里……一共六张表" | `Session`、`Track`、`Pattern`、`ArrangementBlock`、`Note`、`UserPresence` 结构体定义 | `server/src/lib.rs`，第 **5–63** 行（Session: 6 行，Track: 17 行，Pattern: 28 行，ArrangementBlock: 37 行，**Note: 45 行** —— 注意第 52 行新增的 `duration: u16` 字段，UserPresence: 57 行） |
| "每张表都标记为 `public`……" | `#[table(name = note, public)]` 属性标记 | `server/src/lib.rs`，第 **44** 行 |
| "……答案是『reducer』……比如 `add_note`" | `add_note` reducer（校验后插入一行 `Note`，现在带有 `duration` 参数） | `server/src/lib.rs`，第 **230–241** 行 |
| "我们用 `buildConnection` 建立连接……" | WebSocket 连接建立逻辑 | `client/src/spacetime/client.ts`，函数 `buildConnection`（第 **33** 行） |
| "……精确订阅我们关心的几张表" | `SUBSCRIBE_QUERIES` 数组 + `subscriptionBuilder().onApplied(...).subscribe(...)` | `client/src/App.tsx`，第 **7–14** 行 与 第 **121–131** 行 |
| "……注册像 `onInsert` 这样的回调函数" | `c.db.note.onInsert(...)` 实时回调 | `client/src/App.tsx`，第 **93–99** 行 |
| "……只需要一条命令：`spacetime publish`" | 终端 —— 在 server 目录下执行 | `cd server/`，然后执行 `spacetime publish --yes jamspace` |
| （如果还想展示代码生成步骤） | 数据结构变更后重新生成 TypeScript 绑定代码 | `cd server/`，然后执行 `spacetime generate --lang typescript --out-dir ../client/src/module_bindings --module-path .` |

### 前端功能 → 组件文件对照表（供你们排练时参考）

| 脚本中提到的功能 | 对应组件文件 |
|---|---|
| 落地页 / 项目列表 / 创建新项目 | `client/src/components/JoinModal.tsx` |
| 顶部工具栏（播放、BPM、拍号、在线用户、模式切换、返回按钮） | `client/src/components/PlaybackControls.tsx` |
| 鼓机网格（点击切换鼓点） | `client/src/components/DrumGrid.tsx` |
| 旋律网格 —— **拖拽生成带时长的音符** | `client/src/components/StepGrid.tsx` |
| 音轨头部（静音、音量、所有者、删除） | `client/src/components/TrackHeader.tsx` |
| 节拍标尺 / 小节 / "+ Bar" 按钮 | `client/src/components/BeatRuler.tsx` |
| 整体会话布局、播放逻辑、Demo 加载器 | `client/src/components/SessionView.tsx` |
| 示例曲目（摇滚经典 / Trap 节奏 / Lo-Fi 慢节奏） | `client/src/audio/demos.ts` |
| 音频合成（鼓声、贝斯、采样乐器、音符时长播放） | `client/src/audio/instruments.ts` |
| 播放调度器（按步触发音符，将时长换算成秒） | `client/src/audio/scheduler.ts` |
