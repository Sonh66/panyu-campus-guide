import concurrent.futures
import hashlib
import io
import json
from pathlib import Path
import urllib.request

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / 'public/images/entries'
TARGET.mkdir(parents=True, exist_ok=True)
ITEMS = [
    ('pdf-xingan-supermarket', '1542838132-92c53300491e', '超市生鲜货架通用配图'),
    ('pdf-speciality-restaurant', '1517248135467-4c7edcad34c4', '特色餐厅用餐空间通用配图'),
    ('pdf-shanbei-restaurant', '1414235077428-338989a2e8c0', '餐厅餐食与就餐通用配图'),
    ('pdf-hongli-canteen', '1555939594-58d7cb561ad1', '食堂熟食餐点通用配图'),
    ('pdf-lakeside-restaurant', '1555396273-367ea4eb4db5', '湖景餐厅就餐环境通用配图'),
    ('pdf-f5-rice-noodles', '1569718212165-3a8278d5f624', '米粉面食通用配图'),
    ('pdf-encounter-noodles-east', '1552611052-33e04de081de', '面条与配菜通用配图'),
    ('pdf-mcdonalds-east', '1571091718767-18b5b1457add', '汉堡快餐通用配图'),
    ('pdf-jiliudaren-east', '1562967914-608f82629710', '炸鸡快餐通用配图'),
    ('pdf-luckin-t3', '1461023058943-07fcbe16d735', '冰咖啡饮品通用配图'),
    ('pdf-ningji-t5', '1497534446932-c925b458314e', '柠檬青柠与水果冰饮通用配图'),
    ('pdf-cotti-t5', '1495474472287-4d71bcdd2085', '拿铁咖啡饮品通用配图'),
    ('pdf-luckin-east', '1447933601403-0c6688de566e', '咖啡豆与咖啡制作通用配图'),
    ('pdf-chabaidao-east', '1558857563-b371033873b8', '茶饮奶茶通用配图'),
    ('food-campus', '1547592180-85f173990554', '校园日常营养餐通用配图'),
    ('laundry', '1517677208171-0bc6725a3e60', '洗衣后折叠整理的衣物通用配图'),
    ('clothing', '1445205170230-053b83016050', '衣物衣架与换季整理通用配图'),
    ('reuse', '1490481651871-ab68de25d43d', '毕业前分类整理与再利用衣物通用配图'),
    ('pdf-takeout-wuyougo', '1526367790999-0150786686a2', '携带保温箱骑行的外卖配送员通用配图'),
]

def fetch(item):
    entry_id, photo, alt = item
    url = f'https://images.unsplash.com/photo-{photo}?auto=format&fit=max&w=1200&q=86'
    data = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'CampusGuide/1.0'}), timeout=55).read()
    img = Image.open(io.BytesIO(data)).convert('RGB')
    path = TARGET / f'{entry_id}.webp'
    img.save(path, 'WEBP', quality=87, method=6)
    print(f'OK {entry_id} {img.size}', flush=True)
    return {'entryId': entry_id, 'path': f'images/entries/{entry_id}.webp', 'url': url,
            'license': 'Unsplash License — https://unsplash.com/license', 'alt': alt,
            'credit': 'Unsplash 通用场景配图，非暨南大学或对应门店实景',
            'width': img.width, 'height': img.height, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}

if __name__ == '__main__':
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        tasks = {pool.submit(fetch, item): item[0] for item in ITEMS}
        for task in concurrent.futures.as_completed(tasks):
            try:
                results.append(task.result())
            except Exception as exc:
                print(f'ERROR {tasks[task]} {exc}', flush=True)
    results.sort(key=lambda x: next(i for i, item in enumerate(ITEMS) if item[0] == x['entryId']))
    (ROOT / 'docs/unique-images-a.json').write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    columns, cell_w, cell_h = 3, 440, 325
    sheet = Image.new('RGB', (columns * cell_w, ((len(results) + columns - 1) // columns) * cell_h), '#f4f2ec')
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 16)
    for i, row in enumerate(results):
        img = Image.open(ROOT / 'public' / row['path'])
        img.thumbnail((cell_w - 16, cell_h - 45))
        x, y = (i % columns) * cell_w, (i // columns) * cell_h
        sheet.paste(img, (x + 8 + (cell_w - 16 - img.width)//2, y + 6))
        draw.text((x + 8, y + cell_h - 34), row['entryId'], font=font, fill='#111111')
    qa = ROOT / 'qa'
    qa.mkdir(exist_ok=True)
    sheet.save(qa / 'unique-images-a-contact.jpg', quality=90)
