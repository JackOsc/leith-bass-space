import json, re, sys
src = open(sys.argv[1], encoding='utf-8').read().split('\n')
sheet = {'blocks': []}; B = sheet['blocks']
i = 0
def flush_list(kind, items):
    if items: B.append({'type': kind, 'items': items})
while i < len(src):
    line = src[i]
    if line.startswith('# '): sheet['title'] = line[2:].strip()
    elif line.startswith('kicker: '): sheet['kicker'] = line[8:].strip()
    elif line.startswith('aim: '): sheet['aim'] = line[5:].strip()
    elif line.startswith('## '): B.append({'type': 'heading', 'text': line[3:].strip()})
    elif line.startswith('!! '):
        label, text = line[3:].split(' :: ', 1); B.append({'type': 'callout', 'label': label.strip(), 'text': text.strip()})
    elif line.startswith('| '):
        rows = []
        while i < len(src) and src[i].startswith('| '):
            rows.append([c.strip() for c in src[i].strip().strip('|').split('|')]); i += 1
        B.append({'type': 'table', 'headers': rows[0], 'rows': rows[1:]}); continue
    elif line.startswith('- '):
        items = []
        while i < len(src) and src[i].startswith('- '): items.append(src[i][2:].strip()); i += 1
        B.append({'type': 'bullets', 'items': items}); continue
    elif line.strip(): B.append({'type': 'paragraph', 'text': line.strip()})

    i += 1
for b in B:
    for k in ('text',):
        if k in b: b[k] = b[k].replace('`', '')
    if 'items' in b: b['items'] = [t.replace('`', '') for t in b['items']]
    if 'rows' in b: b['rows'] = [[c.replace('`', '') for c in r] for r in b['rows']]
sheet['slug'] = 'Leith-Bass-Space-House-Style-Guide-2.0'
json.dump(sheet, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(B), 'blocks')
