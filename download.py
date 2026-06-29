import json, subprocess, sys, os

candidates = json.load(open('grabbed/candidates.json'))
title      = open('grabbed/title.txt').read().strip()
cookies    = open('grabbed/cookies.txt').read().strip() if os.path.exists('grabbed/cookies.txt') else ''

print(f'Total candidates: {len(candidates)}')

def run_curl(url, dest):
    cmd = [
        'curl', '-L',
        '--retry', '3',
        '--connect-timeout', '30',
        '--max-time', '3600',
        '-o', dest,
        '--show-error',
        '--progress-bar',
        '-H', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        '-H', 'Accept-Language: en-US,en;q=0.9',
        '-H', 'Connection: keep-alive',
        '-H', 'Sec-Fetch-Dest: document',
        '-H', 'Sec-Fetch-Mode: navigate',
        '-H', 'Sec-Fetch-Site: cross-site',
        '-H', 'Sec-Fetch-User: ?1',
        '-H', 'Upgrade-Insecure-Requests: 1',
        '-H', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
        '-H', 'sec-ch-ua: "Google Chrome";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
        '-H', 'sec-ch-ua-mobile: ?0',
        '-H', 'sec-ch-ua-platform: "Windows"',
    ]
    if cookies:
        cmd += ['-H', f'Cookie: {cookies}']
    cmd.append(url)

    print(f'  curl: {url[:80]}')
    r = subprocess.run(cmd)
    print(f'  exit code: {r.returncode}')

    if r.returncode == 0 and os.path.exists(dest):
        sz = os.path.getsize(dest)
        print(f'  size: {sz/1024/1024:.1f} MB')
        if sz > 1_048_576:
            return True
    if os.path.exists(dest):
        os.remove(dest)
    return False

downloaded = False

for i, c in enumerate(candidates):
    url   = c['url']
    ctype = c['type']
    dest  = f'downloads/{title}.mp4'

    print(f'\n=== [{i+1}/{len(candidates)}][{ctype}] {url[:80]}')

    if run_curl(url, dest):
        print('SUCCESS!')
        downloaded = True
        break
    else:
        print('  failed, next...')

if not downloaded:
    print('\nAll candidates failed!')
    sys.exit(1)
