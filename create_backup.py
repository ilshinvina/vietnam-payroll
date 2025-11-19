import os
import json
import datetime

# 백업할 파일 목록
files_to_backup = [
    'index.html',
    'salary-input.html',
    'settings.html',
    'dashboard.js',
    'data-manager.js',
    'salary-calculator.js',
    'settings.js',
    'excel-handler.js',
    'app.js',
    'ui-calendar.js',
    'styles.css'
]

backup_data = {
    'timestamp': datetime.datetime.now().isoformat(),
    'version': '1.0',
    'description': 'Backup before adding meal allowance settings',
    'files': {}
}

for filename in files_to_backup:
    if os.path.exists(filename):
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                backup_data['files'][filename] = f.read()
            print(f'[OK] {filename}')
        except Exception as e:
            print(f'[ERROR] {filename}: {e}')
    else:
        print(f'[SKIP] {filename} (not found)')

# 백업 파일 저장
timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
backup_filename = f'backup_{timestamp}.json'

with open(backup_filename, 'w', encoding='utf-8') as f:
    json.dump(backup_data, f, ensure_ascii=False, indent=2)

print(f'\n=== Backup Complete ===')
print(f'File: {backup_filename}')
print(f'Files backed up: {len(backup_data["files"])} files')
