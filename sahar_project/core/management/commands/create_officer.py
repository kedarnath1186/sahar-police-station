"""
Management command to create a police officer user account.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User


class Command(BaseCommand):
    help = 'Create a new police officer user account with staff privileges.'

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, help='Officer username')
        parser.add_argument('--password', type=str, help='Officer password')
        parser.add_argument('--first-name', type=str, default='', help='First name')
        parser.add_argument('--last-name', type=str, default='', help='Last name')

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('--- Create Police Officer Account ---'))

        username = options.get('username')
        if not username:
            username = input('Username: ').strip()
        if not username:
            self.stdout.write(self.style.ERROR('Username cannot be empty.'))
            return

        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.ERROR(f'User "{username}" already exists.'))
            return

        first_name = options.get('first_name')
        if first_name is None:
            first_name = input('First name: ').strip()

        last_name = options.get('last_name')
        if last_name is None:
            last_name = input('Last name: ').strip()

        password = options.get('password')
        if not password:
            password = input('Password: ').strip()
            if not password:
                self.stdout.write(self.style.ERROR('Password cannot be empty.'))
                return
            confirm_password = input('Confirm password: ').strip()
            if password != confirm_password:
                self.stdout.write(self.style.ERROR('Passwords do not match.'))
                return

        user = User.objects.create_user(
            username=username,
            password=password,
            first_name=first_name,
            last_name=last_name,
            is_staff=True,
        )

        self.stdout.write(self.style.SUCCESS(
            f'Officer account "{user.username}" ({user.get_full_name()}) created successfully.'
        ))
