from pathlib import Path
import xml.etree.ElementTree as ET

SVG_NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', SVG_NS)
ROOT = Path(__file__).resolve().parent.parent
TEXT = f'{{{SVG_NS}}}text'


def remove_header_mark(path: Path, rect_x: str, rect_y: str) -> None:
    tree = ET.parse(path)
    root = tree.getroot()
    children = list(root)
    for index, node in enumerate(children):
        if node.tag == f'{{{SVG_NS}}}rect' and node.get('x') == rect_x and node.get('y') == rect_y:
            root.remove(node)
            if index + 1 < len(children) and children[index + 1].tag == f'{{{SVG_NS}}}path':
                root.remove(children[index + 1])
            break
    tree.write(path, encoding='utf-8', xml_declaration=True)


def edit(path: Path, transform) -> None:
    tree = ET.parse(path)
    transform(tree.getroot())
    tree.write(path, encoding='utf-8', xml_declaration=True)


desktop = ROOT / 'D01-MASAUSTU.svg'
remove_header_mark(desktop, '34', '24')

def desktop_copy(root):
    for node in root.iter(TEXT):
        if node.text == 'TERRASSENPLANER':
            node.set('x', '44')
        elif node.text == 'Unterkante Profil':
            node.text = 'Profil unten'
edit(desktop, desktop_copy)

tablet = ROOT / 'D01-TABLET.svg'
remove_header_mark(tablet, '29', '20')

def tablet_copy(root):
    for node in root.iter(TEXT):
        if node.text == 'TERRASSENPLANER':
            node.set('x', '29')
        elif node.text == 'Feldzahl aus der maximalen Plattenbreite.':
            node.text = 'Feldzahl nach Plattenlimit.'
edit(tablet, tablet_copy)

phone = ROOT / 'D01-TELEFON.svg'
remove_header_mark(phone, '42', '22')

def phone_copy(root):
    for node in list(root.iter(TEXT)):
        if node.text == 'Meine Planung':
            node.set('x', '50')
        elif node.text == 'Prime' and node.get('x') == '292':
            node.set('x', '272')
        elif node.text == 'Premium' and node.get('x') == '340':
            node.set('x', '332')
    for node in list(root.iter(f'{{{SVG_NS}}}rect')):
        if node.get('x') == '267' and node.get('y') == '20':
            node.set('x', '244')
            node.set('width', '122')
        elif node.get('x') == '270' and node.get('y') == '23':
            node.set('x', '247')
            node.set('width', '50')
edit(phone, phone_copy)

profile = ROOT / 'D01-PROFIL-DETAIL.svg'

def profile_close(root):
    for node in list(root):
        if node.tag == f'{{{SVG_NS}}}circle' and node.get('cx') == '1219' and node.get('cy') == '141':
            root.remove(node)
        elif node.tag == f'{{{SVG_NS}}}path' and node.get('d') == 'm1215 137 8 8m0-8-8 8':
            root.remove(node)
edit(profile, profile_close)

summary = ROOT / 'D01-UEBERSICHT.svg'

def summary_caption(root):
    for node in root.iter(TEXT):
        if node.text == 'Illustration: 500 × 300 cm · keine Fertigungsdarstellung':
            node.set('y', '545')
edit(summary, summary_caption)

print('Applied the reviewed text fit, text-only brand label, and mobile selector adjustments.')
