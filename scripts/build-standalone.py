"""将当前语文/数学源码打包为独立文件；合集共用一份老师配音。"""
from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[1]
def script(name):
    return '<script>\n'+(ROOT/name).read_text().replace('</script','<\\/script')+'\n</script>'
def bundle(name):
    html=(ROOT/name).read_text()
    html=re.sub(r'<link rel="stylesheet" href="([^"]+)">',lambda m:'<style>\n'+(ROOT/m[1]).read_text()+'\n</style>',html)
    html=re.sub(r'<script src="([^"]+)"></script>',lambda m:script(m[1].split('?')[0]),html)
    html=re.sub(r'  <script>\s*if \(\'serviceWorker\' in navigator[\s\S]*?</script>', '',html)
    return re.sub(r'  <link rel="manifest"[^>]+>\n','',html)
def js_string(value):
    return json.dumps(value,ensure_ascii=False).replace('</script','<\\/script')
pinyin,math_doc=bundle('index.html'),bundle('math.html')
(ROOT/'点击开始玩-拼音小勇士.html').write_text(pinyin)
(ROOT/'点击开始玩-数学小勇士.html').write_text(math_doc)
path=ROOT/'平板单文件合集-拼音+数学二合一.html';html=path.read_text()
shared=script('teacher-voice-data.js')
small='<script>window.TEACHER_VOICE_DATA = window.parent.TEACHER_VOICE_DATA;</script>'
for label,doc in [('PINYIN_DOC',pinyin),('MATH_DOC',math_doc)]:
    payload=js_string(doc.replace(shared,small))
    html=re.sub(r'^    const '+label+r' = .*?;$',lambda m:'    const '+label+' = '+payload+';',html,flags=re.M)
marker='<!-- SHARED-TEACHER-START -->\n'+shared+'\n<!-- SHARED-TEACHER-END -->'
if '<!-- SHARED-TEACHER-START -->' in html:
    html=re.sub(r'<!-- SHARED-TEACHER-START -->[\s\S]*?<!-- SHARED-TEACHER-END -->',lambda m:marker,html)
else:
    html=html.replace('  <script>\n    const PINYIN_DOC',marker+'\n  <script>\n    const PINYIN_DOC',1)
path.write_text(html)
print('已同步语文、数学独立版和二合一版（合集共用一份老师配音）。')
