import concurrent.futures
import hashlib
import io
import json
import pathlib
import urllib.request
from PIL import Image, ImageOps, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parents[1]
ITEMS = [
    ('pdf-fitness-results', '1517836357463-d25dfeac3438', '力量训练器械与体测运动场景'),
    ('pdf-campus-clinic-location', '1584982751601-97dcc096659c', '听诊器与校医服务主题场景'),
    ('health-guide', '1576091160399-112ba8d25d1d', '医生查看手机与健康咨询主题场景'),
    ('student-support', '1544027993-37dbfe43562a', '双手相互靠近的心理支持主题场景'),
    ('health-notice', '1559757175-0eb30cd8c063', '大脑模型与健康知识主题场景'),
    ('dorm', '1522708323590-d24dbb6b0267', '学生住宿与房间整理场景'),
    ('repair', '1504148455328-c376907d081c', '工具与日常设施报修场景'),
    ('housing-guide', '1560448204-e02f11c3d0e2', '住宿空间与入住生活场景'),
    ('pdf-study-room-location', '1434030216411-0b793f4b4173', '安静自习桌与笔记场景'),
    ('welcome', '1553062407-98eeb64c6a62', '新生入学与行李准备主题的旅行背包'),
    ('academic', '1516321318423-f06f85e504b3', '电脑与课程学习记录主题场景'),
    ('library', 'pexels:256541', '图书馆整齐书架与借阅主题场景'),
    ('scholarship', '1450101499163-c8848c66ca85', '助学申请与材料填写场景'),
    ('career', '1522202176988-66273c2fd55f', '小组协作与实习交流场景'),
    ('graduation', '1627556704302-624286467c65', '毕业生举起学士帽的大学毕业主题场景'),
    ('rights', '1560518883-ce09059eeffa', '房屋模型与钥匙的租房合同权益主题场景'),
    ('pdf-sports-facilities', '1461896836934-ffe607ba8211', '田径运动与体育设施场景'),
    ('pdf-express-centre', 'pexels:4391470', '配送员搬运纸箱与快递收发主题场景'),
    ('pdf-express-address', 'pexels:4246120', '封箱打包与快递寄件地址主题场景'),
    ('metro', 'pexels:302428', '地铁车厢座椅与扶手的公共交通主题场景'),
    ('rail', 'pexels:2031758', '车站中的两列红色客运列车与铁路出行主题场景'),
    ('pdf-xinzao-metro', 'pexels:2859169', '多张街道地图与地铁站路线查找主题场景'),
]

def download(item):
    entry_id, photo_id, alt = item
    is_pexels = photo_id.startswith('pexels:')
    if is_pexels:
        pexels_id = photo_id.split(':',1)[1]
        url = f'https://images.pexels.com/photos/{pexels_id}/pexels-photo-{pexels_id}.jpeg?auto=compress&cs=tinysrgb&w=1200'
    else:
        url = 'https://images.unsplash.com/photo-' + photo_id + '?auto=format&fit=max&w=1200&q=86'
    try:
        req = urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=40) as response:
            source = response.read()
        image = Image.open(io.BytesIO(source)).convert('RGB')
        dest = ROOT / 'public' / 'images' / 'entries' / (entry_id + '.webp')
        dest.parent.mkdir(parents=True, exist_ok=True)
        image.save(dest, 'WEBP', quality=86, method=6)
        result = {'entryId':entry_id, 'path':'images/entries/'+entry_id+'.webp', 'url':url,
                  'license':('Pexels License — https://www.pexels.com/license/' if is_pexels else 'Unsplash License — https://unsplash.com/license'), 'alt':alt,
                  'credit':('Pexels' if is_pexels else 'Unsplash')+' 通用主题场景 · 非具体校园设施',
                  'width':image.width, 'height':image.height,
                  'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()}
        return result
    except Exception as exc:
        return {'entryId':entry_id, 'error':str(exc), 'url':url}

def main():
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        results = list(pool.map(download, ITEMS))
    (ROOT/'docs'/'unique-images-b.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
    good = [x for x in results if 'error' not in x]
    width, height = 1100, ((len(good)+3)//4)*220
    sheet = Image.new('RGB', (width,height), '#f5f5f0')
    draw = ImageDraw.Draw(sheet)
    for idx,result in enumerate(good):
        x,y = (idx%4)*275, (idx//4)*220
        im = Image.open(ROOT/'public'/result['path'])
        sheet.paste(ImageOps.fit(im,(267,175)), (x+4,y+4))
        draw.text((x+5,y+183),result['entryId'],fill='#111')
    dest = ROOT/'qa'/'unique-images-b-contact.jpg'
    dest.parent.mkdir(exist_ok=True)
    sheet.save(dest,quality=92)
    print(json.dumps({'success':len(good),'errors':[x for x in results if 'error' in x], 'contact':str(dest)}, ensure_ascii=False))

if __name__ == '__main__':
    main()
