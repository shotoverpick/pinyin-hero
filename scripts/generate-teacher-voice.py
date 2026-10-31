"""生成并内置老师音色。需要 edge-tts、ffmpeg；只发送清单中的固定游戏文案。"""
from pathlib import Path
import asyncio,base64,hashlib,json,argparse,sys
import edge_tts
ROOT=Path(__file__).resolve().parents[1]
async def main():
    parser=argparse.ArgumentParser();parser.add_argument('--concurrency',type=int,default=6);args=parser.parse_args()
    spec=json.loads((ROOT/'scripts/narration-manifest.json').read_text())
    cache=ROOT/'.voice-cache';cache.mkdir(exist_ok=True)
    sem=asyncio.Semaphore(args.concurrency);done=0;failures=[];data={}
    async def generate(text):
        nonlocal done
        token=hashlib.sha256((spec['voice']+'\0'+spec['rate']+'\0'+text).encode()).hexdigest()
        path=cache/(token+'.mp3');raw=cache/(token+'.raw.mp3');encoded=cache/(token+'.encoded.mp3')
        async with sem:
            for attempt in range(3):
                try:
                    if not path.exists():
                        await asyncio.wait_for(edge_tts.Communicate(text,spec['voice'],rate=spec['rate']).save(str(raw)),timeout=65)
                        proc=await asyncio.create_subprocess_exec('ffmpeg','-v','error','-y','-i',str(raw),'-af','silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.035','-ar','24000','-ac','1','-c:a','libmp3lame','-b:a','32k',str(encoded),stderr=asyncio.subprocess.PIPE)
                        _,err=await proc.communicate()
                        if proc.returncode:raise RuntimeError(err.decode()[:150])
                        encoded.replace(path)
                        raw.unlink(missing_ok=True)
                    audio=path.read_bytes()
                    if len(audio)<300:raise RuntimeError('empty audio')
                    data[text]='data:audio/mpeg;base64,'+base64.b64encode(audio).decode()
                    break
                except Exception as e:
                    path.unlink(missing_ok=True)
                    if attempt==2:failures.append({'text':text,'error':str(e)[:160]})
                    else:await asyncio.sleep(1+attempt*2)
            done+=1
            if done%40==0 or done==len(spec['texts']):print(f'{done}/{len(spec["texts"])} 完成；失败 {len(failures)}',flush=True)
    await asyncio.gather(*(generate(text) for text in spec['texts']))
    (cache/'failures.json').write_text(json.dumps(failures,ensure_ascii=False,indent=2))
    if failures: print('部分文案生成失败，请重试；尚未覆盖正式音频库。',flush=True);sys.exit(1)
    output='// 温柔女老师：神经网络TTS合成，非真人录音。生成参数见 scripts/narration-manifest.json。\nwindow.TEACHER_VOICE_DATA = '+json.dumps(dict(sorted(data.items())),ensure_ascii=False,separators=(',',':'))+';\n'
    temporary=ROOT/'teacher-voice-data.js.tmp'
    temporary.write_text(output)
    temporary.replace(ROOT/'teacher-voice-data.js')
    print(f'已写入 teacher-voice-data.js：{len(data)} 段，{len(output.encode())/1024/1024:.1f} MB',flush=True)
asyncio.run(main())
