# 统一女老师 TTS 配音

语文、数学、拼音键盘、声母韵母、整体认读、四声、课文与游戏提示，现均使用同一位女老师的合成声线。

- 声音：Microsoft `zh-CN-XiaoxiaoNeural`，基础语速 `-8%`。
- 生成工具：`edge-tts`；仅发送清单中的固定文案，不发送浏览器存档，不传入付费账号或 API 密钥。
- `teacher-voice-data.js`：中文讲解、生字、词语、数字和动态数学读题片段。
- `pinyin-audio-data.js`：同一 TTS 声线制作的拼音音频；不再使用上一版的外部真人录音。
- 拼音源文字和处理方法逐项记录在 `scripts/phonetic-provenance.json`。
  普通音节优先使用对应汉字的 TTS 读音；缺少独立汉字读音的四声使用 WORLD 音频合成调整基频曲线，
  保留源 TTS 的谱包络，不靠加速或减速改变声调。ong 的韵母从同声线 hong 音频中去除 h 声母。
  这些是合成音频及发音处理结果，尚未经过教师逐音节人工听审。
- 两个游戏共用 `teacher-voice-player.js`，不调用浏览器/系统语音或其他在线配音。
  音频播放失败会提示重试，不会悄悄切换音色。游戏音效仍是普通电子音效，不属于朗读配音。
- 原 `key-audio-data.js` 已从页面和离线缓存清单中移除，不参与播放。

固定音频内置于网页，游玩时不向 TTS 服务发送文字；语速调节保留音高。
使用或公开分发合成音频仍应遵循相关服务条款；工具无需密钥不等于永久免费或可任意商用。

## 重新生成

需要 `edge-tts`、`pypinyin`、`numpy`、`pyworld` 和 `ffmpeg`。

1. `node scripts/collect-narration.cjs`
2. `python3 scripts/prepare-unified-voice.py`
3. `python3 scripts/generate-teacher-voice.py`
4. `python3 scripts/build-tts-phonetics.py`
5. `python3 scripts/build-standalone.py`
6. `node tests/unified-voice.cjs`

`.voice-cache/` 保存生成缓存，已排除在 Git 外。所有输出均为单声道 24 kHz / 32 kbps MP3。
