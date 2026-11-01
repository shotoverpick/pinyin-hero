# 素材与音效来源

- `assets/duck-flight-v2.png`、`tank-hull-v2.png`、`tank-turret-v2.png`、`balloon-v2.png`：本次用内置 imagegen 生成的原创素材，透明背景。
- `audio/cannon.mp3`、`impact.mp3`、`engine.mp3`：Kenney《Sci-fi Sounds》，CC0。
  原作者页面：https://kenney.nl/assets/sci-fi-sounds
  作者发布的镜像：https://opengameart.org/content/sci-fi-sounds
  分别来自 `explosionCrunch_000.ogg`、`impactMetal_001.ogg`、`engineCircular_000.ogg`；转为 MP3 并做音量处理。
- `audio/balloon-pop.mp3`：真实气球爆破录音，Gniffelbaf《Balloon pop》，由 AntumDeluge 整理发布，CC0。
  原始录音：https://freesound.org/s/82119/
  下载来源：https://opengameart.org/content/balloon-sounds （`balloon_pop.flac`）。转为 MP3，保持原音高和速度。
- `audio/shotgun.mp3`：Vincent (Vince) Sevedge《10 Guage Shotgun》，Copyright 2009 Vincent Sevedge；Tabasco 发布的《Gunshot Sounds》中的 `shotty.wav`，为打靶实录。
  来源：https://opengameart.org/content/gunshot-sounds
  页面标记 CC0，但下载包内原始声明为 CC BY 3.0；本项目遵循更严格的原始 CC BY 3.0，保留署名与许可：https://creativecommons.org/licenses/by/3.0/ 。改动：转为单声道 MP3、降低 6 dB、末尾淡出，保持原速度和音高。
- 以上许可及原始声明副本见 `audio/REAL-SFX-LICENSES.txt`。实录音效内嵌进 `arcade-sound-data.js`，离线也可播放。
- 气流、翅膀、鸭叫及短反馈声：项目内 Web Audio 分层合成，不涉及声音克隆。
- 数学配音沿用同一女老师 TTS 声线，整句生成并去掉首尾空白，保留音高调整时长。
