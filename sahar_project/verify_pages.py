import re
import requests

s = requests.Session()

# 1. Test Login page
r = s.get('http://127.0.0.1:8000/login/')
print('1. Login GET status:', r.status_code)
assert r.status_code == 200
assert 'Prototype: dummy data only.' in r.text
assert 'Sahar Police Station' in r.text
assert 'सहार पोलीस ठाणे' in r.text
print('   Login page verified.')

# 2. Test Protected Dashboard redirects when unauthenticated
r_unauth = requests.get('http://127.0.0.1:8000/', allow_redirects=False)
print('2. Unauthenticated access to / returned status:', r_unauth.status_code)
assert r_unauth.status_code == 302
assert '/login/' in r_unauth.headers.get('Location', '')
print('   Login required redirection verified.')

# 3. Perform Login
match = re.search(r'name=["\']csrfmiddlewaretoken["\'] value=["\']([^"\']+)["\']', r.text)
csrf_token = match.group(1) if match else ''

login_data = {
    'username': 'officer',
    'password': 'police123',
    'csrfmiddlewaretoken': csrf_token
}
r_login = s.post(
    'http://127.0.0.1:8000/login/',
    data=login_data,
    headers={'Referer': 'http://127.0.0.1:8000/login/'}
)
print('3. Login POST status:', r_login.status_code, 'Final URL:', r_login.url)
assert r_login.status_code == 200
assert 'Dashboard' in r_login.text
assert 'Prototype: dummy data only.' in r_login.text
print('   Authentication successful.')

# 4. Check all views while authenticated
endpoints = [
    ('/', 'Dashboard'),
    ('/accused/', 'Accused Records'),
    ('/accused/add/', 'Register Accused Record'),
    ('/accused/table/', 'Registry (DataTables)'),
    ('/accused/map/', 'Accused Geographic Surveillance Map'),
    ('/accused/1/', 'Dossier'),
    ('/places/', 'Famous Places'),
    ('/places/add/', 'Register Famous Place'),
]

for url, title in endpoints:
    resp = s.get('http://127.0.0.1:8000' + url)
    print(f'4. Checking {url} -> status: {resp.status_code}, contains expected title: {title in resp.text}')
    assert resp.status_code == 200, f'Failed on {url}'
    assert title in resp.text, f'Title "{title}" missing in {url}'

# 5. Check AJAX photos API
api_resp = s.get('http://127.0.0.1:8000/accused/1/photos/json/')
print('5. AJAX Photos API status:', api_resp.status_code, 'JSON keys:', list(api_resp.json().keys()))
assert api_resp.status_code == 200
assert 'photos' in api_resp.json()

print('\n*** ALL SYSTEM VERIFICATIONS PASSED 100%! ***')
