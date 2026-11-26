# Checks that every precompiled Expo framework finds, in the other precompiled
# frameworks, every Swift symbol it imports from them. A missing symbol is a
# crash at launch ("DYLD Symbol missing") that no simulator Debug build shows.
import glob, os, re, subprocess, sys, tarfile, tempfile
root = sys.argv[1]
slice_name = sys.argv[2] if len(sys.argv) > 2 else 'ios-arm64'
tmp = tempfile.mkdtemp()
binaries = {}
for tar in glob.glob(os.path.join(root, 'node_modules', '**', 'prebuilds', 'output', 'release', 'xcframeworks', '*.tar.gz'), recursive=True):
    name = os.path.basename(tar)[:-7]
    out = os.path.join(tmp, name + '-' + str(len(binaries)))
    os.makedirs(out)
    with tarfile.open(tar) as t:
        t.extractall(out)
    for path in glob.glob(os.path.join(out, '**', slice_name, '*.framework', '*'), recursive=True):
        if os.path.basename(path) == os.path.basename(os.path.dirname(path))[:-10]:
            binaries.setdefault(os.path.basename(path), []).append((path, tar))
def syms(path, flag):
    out = subprocess.run(['nm', flag, path], capture_output=True, text=True).stdout
    return {line.split()[-1] for line in out.splitlines() if line.strip()}
defined = {}
for name, copies in binaries.items():
    defined[name] = set().union(*(syms(p, '-gU') for p, _ in copies))
print(f'{len(binaries)} precompiled frameworks, slice {slice_name}')
dupes = {n: c for n, c in binaries.items() if len(c) > 1}
for n, c in dupes.items():
    print(f'  DUPLICATE {n}: ' + ', '.join(os.path.relpath(t, root) for _, t in c))
bad = 0
for name, copies in sorted(binaries.items()):
    for path, tar in copies:
        for sym in sorted(syms(path, '-u')):
            m = re.match(r'_\$s(\d+)', sym)
            if not m: continue
            n = int(m.group(1)); mod = sym[3 + len(m.group(1)):3 + len(m.group(1)) + n]
            if mod in defined and mod != name and sym not in defined[mod]:
                bad += 1
                if bad <= 12: print(f'  MISSING {name} needs {mod}: {sym[:110]}')
print('missing symbols:', bad)
sys.exit(1 if bad else 0)
