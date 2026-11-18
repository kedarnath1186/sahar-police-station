from django import forms
from django.core.exceptions import ValidationError

from .models import Accused, AccusedPhoto


class AccusedForm(forms.ModelForm):
    """Form for creating and editing accused records."""

    class Meta:
        model = Accused
        fields = [
            'full_name', 'mobile_number', 'detailed_address',
            'village', 'city', 'taluka', 'district', 'state', 'pincode',
        ]
        widgets = {
            'full_name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Full Name',
            }),
            'mobile_number': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': '10-digit mobile number',
                'maxlength': '10',
            }),
            'detailed_address': forms.Textarea(attrs={
                'class': 'form-control',
                'placeholder': 'Detailed address',
                'rows': 3,
            }),
            'village': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Village',
            }),
            'city': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'City',
            }),
            'taluka': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Taluka',
            }),
            'district': forms.Select(attrs={
                'class': 'form-select',
            }),
            'state': forms.Select(attrs={
                'class': 'form-select',
            }),
            'pincode': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': '6-digit pincode',
                'maxlength': '6',
            }),
        }

    def clean_mobile_number(self):
        mobile = self.cleaned_data.get('mobile_number', '')
        if not mobile.isdigit() or len(mobile) != 10:
            raise ValidationError('Mobile number must be exactly 10 digits.')
        return mobile

    def clean_pincode(self):
        pincode = self.cleaned_data.get('pincode', '')
        if not pincode.isdigit() or len(pincode) != 6:
            raise ValidationError('Pincode must be exactly 6 digits.')
        return pincode


class AccusedPhotoForm(forms.ModelForm):
    """Form for uploading photos of accused persons."""

    latitude = forms.FloatField(widget=forms.HiddenInput(), required=True)
    longitude = forms.FloatField(widget=forms.HiddenInput(), required=True)

    class Meta:
        model = AccusedPhoto
        fields = ['image', 'location_address', 'caption', 'latitude', 'longitude']
        widgets = {
            'image': forms.ClearableFileInput(attrs={
                'class': 'form-control',
                'accept': 'image/jpeg,image/png,image/webp',
            }),
            'location_address': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Location where photo was taken',
            }),
            'caption': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Caption (optional)',
            }),
        }

    def clean_image(self):
        image = self.cleaned_data.get('image')
        if image:
            # Validate file size (5 MB max)
            if image.size > 5 * 1024 * 1024:
                raise ValidationError('Image file size must be under 5 MB.')

            # Validate file extension
            valid_extensions = ('.jpg', '.jpeg', '.png', '.webp')
            if not image.name.lower().endswith(valid_extensions):
                raise ValidationError(
                    'Only JPG, PNG, and WEBP image formats are allowed.'
                )

            # Verify with Pillow
            try:
                from PIL import Image
                img = Image.open(image)
                img.verify()
                if img.format not in ('JPEG', 'PNG', 'WEBP'):
                    raise ValidationError(
                        'Invalid image format. Only JPEG, PNG, and WEBP are allowed.'
                    )
                # Reset file pointer after verify
                image.seek(0)
            except ValidationError:
                raise
            except Exception:
                raise ValidationError(
                    'The uploaded file is not a valid image.'
                )

        return image
