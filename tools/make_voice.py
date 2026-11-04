# Generates the narration clips (voice: ar-EG-ShakirNeural) into ../assets/voice/
# Only lines that are new or whose text changed are generated again.
import asyncio, json, os
import edge_tts

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, 'assets', 'voice')
VOICE = 'ar-EG-ShakirNeural'

async def main():
    with open(os.path.join(HERE, 'voice-lines.json'), encoding='utf-8') as f:
        lines = json.load(f)
    os.makedirs(OUT, exist_ok=True)
    man_path = os.path.join(OUT, 'manifest.json')
    try:
        with open(man_path, encoding='utf-8') as f:
            manifest = json.load(f)
    except Exception:
        manifest = {}
    todo = [(k, v.get('s') or v['t']) for k, v in lines.items()
            if manifest.get(k) != (v.get('s') or v['t']) or not os.path.exists(os.path.join(OUT, k + '.mp3'))]
    print(f'{len(todo)} clip(s) to generate')
    for i, (key, text) in enumerate(todo, 1):
        path = os.path.join(OUT, key + '.mp3')
        for attempt in range(3):
            try:
                await edge_tts.Communicate(text, VOICE, rate='-4%').save(path)
                manifest[key] = text
                break
            except Exception as e:
                print('  retry', key, e)
                await asyncio.sleep(2)
        print(f'[{i}/{len(todo)}] {key}')
        with open(man_path, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, ensure_ascii=False, indent=1)

asyncio.run(main())
