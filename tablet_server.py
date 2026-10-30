#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import gzip
import http.server
import io
import os
import re
import socket
import socketserver
import subprocess
import sys
import threading
import time
import webbrowser

os.chdir(os.path.dirname(os.path.abspath(__file__)))

def get_lan_ip():
    for iface in ("en0", "en1", "en2"):
        try:
            out = subprocess.check_output(["ipconfig", "getifaddr", iface], stderr=subprocess.DEVNULL).decode().strip()
            if out and not out.startswith("127.") and not out.startswith("198.18."):
                return out
        except Exception:
            pass
    try:
        out = subprocess.check_output(
            "ifconfig | grep 'inet ' | grep -v 127.0.0.1 | grep -v '198.18.' | awk '{print $2}' | head -n 1",
            shell=True
        ).decode().strip()
        if out:
            return out
    except Exception:
        pass
    return "127.0.0.1"

def gf_mul(x, y):
    r = 0
    while y:
        if y & 1:
            r ^= x
        y >>= 1
        x <<= 1
        if x & 0x100:
            x ^= 0x11d
    return r

def rs_encode(data, nsym):
    g = [1]
    x = 1
    for _ in range(nsym):
        ng = [0] * (len(g) + 1)
        for i, c in enumerate(g):
            ng[i] ^= c
            ng[i + 1] ^= gf_mul(c, x)
        g = ng
        x = gf_mul(x, 2)
    res = list(data) + [0] * nsym
    for i in range(len(data)):
        coef = res[i]
        if coef:
            for j in range(1, len(g)):
                res[i + j] ^= gf_mul(g[j], coef)
    return res[len(data):]

# QR Version 1..6 (Level L, single block)
QR_VERSIONS = [
    # (version, size, data_cw, ec_cw, align_list)
    (1, 21, 19, 7, []),
    (2, 25, 34, 10, [18]),
    (3, 29, 55, 15, [22]),
    (4, 33, 80, 20, [26]),
    (5, 37, 108, 26, [30]),
]

def make_qr_matrix(text):
    raw = text.encode("utf-8")
    chosen = None
    for v, size, data_cw, ec_cw, aligns in QR_VERSIONS:
        if len(raw) + 2 <= data_cw:
            chosen = (v, size, data_cw, ec_cw, aligns)
            break
    if not chosen:
        chosen = QR_VERSIONS[-1]
    v, size, data_cw, ec_cw, aligns = chosen

    bits = [0, 1, 0, 0]
    for i in range(7, -1, -1):
        bits.append((len(raw) >> i) & 1)
    for b in raw:
        for i in range(7, -1, -1):
            bits.append((b >> i) & 1)
    bits.extend([0] * min(4, data_cw * 8 - len(bits)))
    while len(bits) % 8 != 0:
        bits.append(0)
    codewords = [int("".join(map(str, bits[i:i+8])), 2) for i in range(0, len(bits), 8)]
    pads = [0xEC, 0x11]
    p_idx = 0
    while len(codewords) < data_cw:
        codewords.append(pads[p_idx % 2])
        p_idx += 1
    codewords.extend(rs_encode(codewords, ec_cw))
    all_bits = []
    for cw in codewords:
        for i in range(7, -1, -1):
            all_bits.append((cw >> i) & 1)
    all_bits.extend([0] * 7)

    mat = [[0] * size for _ in range(size)]
    is_func = [[False] * size for _ in range(size)]

    def set_fn(r, c, val):
        mat[r][c] = int(bool(val))
        is_func[r][c] = True

    def finder(r0, c0):
        for dr in range(-1, 8):
            for dc in range(-1, 8):
                r, c = r0 + dr, c0 + dc
                if 0 <= r < size and 0 <= c < size:
                    v = (0 <= dr <= 6 and (dc in (0, 6) or dr in (0, 6))) or (2 <= dr <= 4 and 2 <= dc <= 4)
                    set_fn(r, c, v)

    finder(0, 0)
    finder(0, size - 7)
    finder(size - 7, 0)
    for i in range(8, size - 8):
        set_fn(6, i, i % 2 == 0)
        set_fn(i, 6, i % 2 == 0)
    for ar in aligns:
        for ac in aligns:
            for dr in range(-2, 3):
                for dc in range(-2, 3):
                    set_fn(ar + dr, ac + dc, max(abs(dr), abs(dc)) != 1)
    set_fn(size - 8, 8, 1)

    for i in range(9):
        if not is_func[8][i]:
            set_fn(8, i, 0)
        if not is_func[i][8]:
            set_fn(i, 8, 0)
    for i in range(8):
        set_fn(8, size - 1 - i, 0)
        set_fn(size - 1 - i, 8, 0)

    idx = 0
    up = True
    c = size - 1
    while c > 0:
        if c == 6:
            c -= 1
        rows = range(size - 1, -1, -1) if up else range(size)
        for r in rows:
            for dc in (0, -1):
                cc = c + dc
                if not is_func[r][cc]:
                    bit = all_bits[idx] if idx < len(all_bits) else 0
                    idx += 1
                    if (r + cc) % 2 == 0:
                        bit ^= 1
                    mat[r][cc] = bit
        up = not up
        c -= 2

    fmt = 0x77c4
    fbits = [(fmt >> i) & 1 for i in range(15)]
    coords1 = [(8,0),(8,1),(8,2),(8,3),(8,4),(8,5),(8,7),(8,8),(7,8),(5,8),(4,8),(3,8),(2,8),(1,8),(0,8)]
    for i, (r, cc) in enumerate(coords1):
        mat[r][cc] = fbits[14 - i]
    coords2 = [(size-1,8),(size-2,8),(size-3,8),(size-4,8),(size-5,8),(size-6,8),(size-7,8),(8,size-8),(8,size-7),(8,size-6),(8,size-5),(8,size-4),(8,size-3),(8,size-2),(8,size-1)]
    for i, (r, cc) in enumerate(coords2):
        mat[r][cc] = fbits[14 - i]
    return mat

def qr_to_svg(mat, box_px=220):
    n = len(mat)
    border = 4
    total = n + border * 2
    rects = []
    for r in range(n):
        for c in range(n):
            if mat[r][c]:
                rects.append(f'<rect x="{c + border}" y="{r + border}" width="1" height="1" fill="#111"/>')
    return f'<svg viewBox="0 0 {total} {total}" width="{box_px}" height="{box_px}" shape-rendering="crispEdges" style="background:#fff;border-radius:16px;box-shadow:0 4px 16px rgba(0,0,0,.08)">{"".join(rects)}</svg>'

class FastGzipHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_GET(self):
        # Short paths for cleaner QR codes!
        if self.path in ("/p", "/p/", "/pinyin"):
            self.path = "/index.html"
        elif self.path in ("/m", "/m/", "/math"):
            self.path = "/math.html"
        elif self.path == "/status.json":
            body = b'{"ok":true}'
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        path = self.translate_path(self.path)
        accept_enc = self.headers.get("Accept-Encoding", "")
        if "gzip" in accept_enc and os.path.isfile(path) and path.endswith((".js", ".css", ".html", ".json")):
            try:
                with open(path, "rb") as f:
                    raw = f.read()
                buf = io.BytesIO()
                with gzip.GzipFile(fileobj=buf, mode="wb", compresslevel=6) as gz:
                    gz.write(raw)
                compressed = buf.getvalue()
                ctype = self.guess_type(path)
                if ctype.startswith("text/") or "javascript" in ctype or "json" in ctype:
                    ctype += "; charset=utf-8"
                self.send_response(200)
                self.send_header("Content-Type", ctype)
                self.send_header("Content-Encoding", "gzip")
                self.send_header("Content-Length", str(len(compressed)))
                self.end_headers()
                self.wfile.write(compressed)
                return
            except Exception:
                pass
        return super().do_GET()

    def log_message(self, fmt, *args):
        pass

class ThreadedHTTPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True

def write_portal_html(lan_ip, port, public_base=None):
    lan_pinyin = f"http://{lan_ip}:{port}/p"
    lan_math = f"http://{lan_ip}:{port}/m"

    if public_base:
        pub_pinyin = f"{public_base}/p"
        pub_math = f"{public_base}/m"
        pub_pinyin_qr = qr_to_svg(make_qr_matrix(pub_pinyin), 220)
        pub_math_qr = qr_to_svg(make_qr_matrix(pub_math), 220)
        pub_section = f"""
        <div class="section-banner pub-banner">
          <div class="badge-tag">🌟 强烈推荐 · 全网通用直连（不受 VPN / 路由器隔离 / Wi-Fi 限制）</div>
          <div class="banner-desc">直接用平板<b>自带相机</b>、<b>浏览器扫码</b>或<b>微信扫一扫</b>均可秒开！（即使平板用流量或电脑开了代理也能连）</div>
          <div class="cards">
            <div class="card pinyin">
              <h2>🔤 拼音小勇士（全网扫码）</h2>
              <p>一年级语文上册 · 拼音手写 + 田字格写字 + 闯关</p>
              {pub_pinyin_qr}
              <div class="url-box">{pub_pinyin}</div>
              <a class="btn" style="background:#12b886" href="{pub_pinyin}" target="_blank">🌐 点击直接打开</a>
            </div>
            <div class="card math">
              <h2>🦸‍♂️ 数学小勇士（全网扫码）</h2>
              <p>一年级数学上册 · 加减法与凑十法闯关</p>
              {pub_math_qr}
              <div class="url-box">{pub_math}</div>
              <a class="btn" href="{pub_math}" target="_blank">🌐 点击直接打开</a>
            </div>
          </div>
        </div>
        """
    else:
        pub_section = """
        <div class="section-banner waiting-banner">
          ⏳ 正在尝试建立全网通用云端通道，请稍候刷新页面，或直接使用下方局域网扫码...
        </div>
        """

    lan_pinyin_qr = qr_to_svg(make_qr_matrix(lan_pinyin), 200)
    lan_math_qr = qr_to_svg(make_qr_matrix(lan_math), 200)

    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>📱 平板扫码玩游戏 · 拼音小勇士 & 数学小勇士</title>
  <style>
    body {{
      margin: 0; font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
      background: linear-gradient(180deg, #b8ecff 0%, #e8f8ff 55%, #fff8df 100%);
      min-height: 100vh; color: #3b3355; display: flex; flex-direction: column; align-items: center;
      padding: 24px 16px 48px;
    }}
    h1 {{ margin: 0 0 8px; font-size: 32px; color: #ff6b35; text-shadow: 2px 2px 0 #fff; text-align: center; }}
    .status-bar {{
      margin: 6px 0 18px; padding: 10px 20px; border-radius: 999px; font-weight: 800; font-size: 16px;
      background: #d3f9d8; color: #2b8a3e; border: 2px solid #8ce99a;
    }}
    .status-bar.err {{ background: #ffe3e3; color: #c92a2a; border-color: #ffa8a8; }}
    .section-banner {{
      width: 100%; max-width: 900px; border-radius: 28px; padding: 22px 24px; margin-bottom: 24px;
      box-sizing: border-box;
    }}
    .pub-banner {{
      background: linear-gradient(135deg, #e6fcf5 0%, #fff9db 100%);
      border: 4px solid #20c997; box-shadow: 0 12px 32px rgba(32, 201, 151, 0.18);
    }}
    .lan-banner {{
      background: rgba(255,255,255,0.75); border: 3px dashed #74c0fc;
    }}
    .badge-tag {{
      display: inline-block; background: #12b886; color: #fff; font-weight: 900; font-size: 17px;
      padding: 6px 16px; border-radius: 999px; margin-bottom: 8px;
    }}
    .banner-desc {{ font-size: 16px; color: #495057; margin-bottom: 18px; line-height: 1.5; }}
    .cards {{ display: flex; gap: 24px; flex-wrap: wrap; justify-content: center; }}
    .card {{
      background: #fff; border-radius: 24px; padding: 22px 24px; text-align: center;
      box-shadow: 0 8px 24px rgba(80,60,140,.10); width: 340px; border: 4px solid #d0ebff;
    }}
    .card.math {{ border-color: #74c0fc; }}
    .card.pinyin {{ border-color: #63e6be; }}
    .card h2 {{ margin: 0 0 6px; font-size: 23px; }}
    .card p {{ margin: 0 0 14px; color: #7a7393; font-size: 14px; }}
    .url-box {{
      margin-top: 12px; background: #f8f9fa; padding: 10px 12px; border-radius: 12px;
      font-family: monospace; font-size: 15px; font-weight: 700; color: #1971c2;
      word-break: break-all; border: 2px dashed #a5d8ff; user-select: all;
    }}
    .btn {{
      display: inline-block; margin-top: 12px; padding: 10px 20px; border-radius: 14px;
      background: #339af0; color: #fff; text-decoration: none; font-weight: 800; font-size: 15px;
    }}
    .tips {{
      margin-top: 12px; background: #fff9db; border: 3px solid #ffd43b; border-radius: 22px;
      padding: 18px 24px; max-width: 860px; line-height: 1.8; font-size: 15px;
    }}
  </style>
</head>
<body>
  <h1>📱 平板电脑扫码玩 · 拼音小勇士 & 数学小勇士</h1>
  <div id="srvStatus" class="status-bar">✅ 电脑端游戏服务正在运行中，请直接用平板扫码！</div>

  {pub_section}

  <div class="section-banner lan-banner">
    <div class="badge-tag" style="background:#339af0">🏠 备选方案：家里同 Wi-Fi 局域网直连</div>
    <div class="banner-desc">
      如果平板和电脑在同一个 Wi-Fi 下，且电脑<b>未开启 VPN 虚拟网卡 (TUN 模式)</b>，也可以直接扫下方局域网二维码，或在平板浏览器地址栏输入下方网址：
    </div>
    <div class="cards">
      <div class="card pinyin">
        <h2>🔤 拼音小勇士（局域网）</h2>
        <p>在平板 Safari / 浏览器输入下方短网址：</p>
        {lan_pinyin_qr}
        <div class="url-box">{lan_pinyin}</div>
        <a class="btn" style="background:#20c997" href="{lan_pinyin}" target="_blank">💻 本机测试打开</a>
      </div>
      <div class="card math">
        <h2>🦸‍♂️ 数学小勇士（局域网）</h2>
        <p>在平板 Safari / 浏览器输入下方短网址：</p>
        {lan_math_qr}
        <div class="url-box">{lan_math}</div>
        <a class="btn" href="{lan_math}" target="_blank">💻 本机测试打开</a>
      </div>
    </div>
  </div>

  <div class="tips">
    <b>💡 为什么之前扫码打不开？怎么解决？</b><br>
    1. <b>原因一（电脑开了 VPN / Clash 增强模式）</b>：您的 Mac 开启了虚拟网卡代理（<code>198.18.0.1</code>），会拦截平板对 <code>192.168.31.153</code> 的局域网访问。👉 <b>解决办法</b>：请直接扫最上方绿框里的<b>「🌟 全网通用直连二维码」</b>，它走加密公网，无视 VPN 和 Wi-Fi 限制！<br>
    2. <b>原因二（用微信扫了局域网码）</b>：微信内置浏览器有时会屏蔽 <code>192.168</code> 局域网地址。👉 <b>解决办法</b>：扫最上方的<b>全网通用二维码</b>，或者用平板自带的<b>「相机」App</b>扫码，亦可在平板浏览器直接手动输入短网址。<br>
    3. <b>原因三（彻底离线传到平板上玩）</b>：您也可以把文件夹里的 <code>点击开始玩-拼音小勇士.html</code> 通过<b>隔空投送 (AirDrop)</b> 发到 iPad，在 iPad「文件」App 里点击就能直接玩！
  </div>

  <script>
    fetch('/status.json').then(r => r.json()).then(() => {{
      const el = document.getElementById('srvStatus');
      el.textContent = '✅ 电脑后台游戏服务已连接成功！现在拿平板扫码即可畅玩！';
    }}).catch(() => {{
      if (location.protocol === 'file:') {{
        const el = document.getElementById('srvStatus');
        el.textContent = '🌐 如果上方有「全网通用二维码」可直接扫；若打不开请双击文件夹里的【双击让平板扫码玩.command】启动服务！';
      }}
    }});
  </script>
</body>
</html>
"""
    with open("平板扫码入口.html", "w", encoding="utf-8") as f:
        f.write(html)
    with open("tunnel_info.txt", "w", encoding="utf-8") as f:
        f.write(f"LAN_PINYIN={lan_pinyin}\nLAN_MATH={lan_math}\nPUBLIC_BASE={public_base or ''}\n")

def start_public_tunnel(lan_ip, port):
    # Try localhost.run via standard macOS ssh
    cmd = [
        "ssh", "-o", "StrictHostKeyChecking=no",
        "-o", "UserKnownHostsFile=/dev/null",
        "-o", "ServerAliveInterval=30",
        "-R", f"80:127.0.0.1:{port}",
        "nokey@localhost.run"
    ]
    try:
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        for line in proc.stdout:
            m = re.search(r"(https://[a-zA-Z0-9.-]+\.lhr\.life)", line)
            if m:
                pub_url = m.group(1)
                print(f"\n🌟 全网通用云端直连已开通: {pub_url}/p")
                write_portal_html(lan_ip, port, pub_url)
                break
    except Exception as e:
        print("Tunnel error:", e)

def main():
    port = 8686
    # Check if 8686 is already in use; if so, kill old python server on 8686 or pick it
    try:
        out = subprocess.check_output(["lsof", "-ti", f":{port}"], stderr=subprocess.DEVNULL).decode().strip()
        for pid in out.splitlines():
            if pid.strip().isdigit():
                os.kill(int(pid.strip()), 9)
        time.sleep(0.3)
    except Exception:
        pass

    lan_ip = get_lan_ip()
    write_portal_html(lan_ip, port, None)

    t = threading.Thread(target=start_public_tunnel, args=(lan_ip, port), daemon=True)
    t.start()

    def open_portal():
        # Wait up to 4.5s for public tunnel URL to populate before opening browser
        for _ in range(18):
            time.sleep(0.25)
            try:
                with open("tunnel_info.txt", "r", encoding="utf-8") as f:
                    if "https://" in f.read():
                        break
            except Exception:
                pass
        if "--no-open" not in sys.argv:
            webbrowser.open(f"http://127.0.0.1:{port}/平板扫码入口.html")

    threading.Thread(target=open_portal, daemon=True).start()

    print(f"🎉 游戏服务已启动: http://{lan_ip}:{port}/平板扫码入口.html")
    with ThreadedHTTPServer(("0.0.0.0", port), FastGzipHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass

if __name__ == "__main__":
    main()
