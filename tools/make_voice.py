# Generates the narration clips (voice: ar-EG-ShakirNeural) into ../assets/voice/
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
    for i, (key, line) in enumerate(lines.items(), 1):
        text = line.get('s') or line['t']
        path = os.path.join(OUT, key + '.mp3')
        for attempt in range(3):
            try:
                await edge_tts.Communicate(text, VOICE, rate='-4%').save(path)
                break
            except Exception as e:
                print('  retry', key, e)
                await asyncio.sleep(2)
        print(f'[{i}/{len(lines)}] {key}')

asyncio.run(main())
