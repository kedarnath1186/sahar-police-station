from django import forms
from django.core.exceptions import ValidationError

from .models import FamousPlace


class FamousPlaceForm(forms.ModelForm):
    """Form for creating and editing famous places."""

    class Meta:
        model = FamousPlace
        fields = ['name', 'description', 'city', 'district', 'address', 'photo']
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Place name',
            }),
            'description': forms.Textarea(attrs={
                'class': 'form-control',
                'placeholder': 'Description of the place',
                'rows': 4,
            }),
            'city': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'City',
            }),
            'district': forms.Select(attrs={
                'class': 'form-select',
            }),
            'address': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Full address',
            }),
            'photo': forms.ClearableFileInput(attrs={
                'class': 'form-control',
                'accept': 'image/jpeg,image/png,image/webp',
            }),
        }

    def clean_photo(self):
        photo = self.cleaned_data.get('photo')
        if photo:
            # Validate file size (5 MB max)
            if hasattr(photo, 'size') and photo.size > 5 * 1024 * 1024:
                raise ValidationError('Image file size must be under 5 MB.')

            # Validate file extension
            valid_extensions = ('.jpg', '.jpeg', '.png', '.webp')
            if hasattr(photo, 'name') and not photo.name.lower().endswith(valid_extensions):
                raise ValidationError(
                    'Only JPG, PNG, and WEBP image formats are allowed.'
                )

            # Verify with Pillow
            try:
                from PIL import Image
                img = Image.open(photo)
                img.verify()
                if img.format not in ('JPEG', 'PNG', 'WEBP'):
                    raise ValidationError(
                        'Invalid image format. Only JPEG, PNG, and WEBP are allowed.'
                    )
                # Reset file pointer after verify
                photo.seek(0)
            except ValidationError:
                raise
            except Exception:
                raise ValidationError(
                    'The uploaded file is not a valid image.'
                )

        return photo
