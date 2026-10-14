from rest_framework import serializers


class ProductSearchSerializer(serializers.Serializer):

    message = serializers.CharField(
        max_length=4000,
        trim_whitespace=True,
        error_messages={
            "required": "The 'message' field is required.",
            "blank": "Search message cannot be empty.",
            "max_length": "Message is too long. Maximum 4000 characters allowed.",
        },
    )
