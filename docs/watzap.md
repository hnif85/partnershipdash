Endpoint ini berfungsi untuk mengirim pesan teks only yang berisi konten promosi atau pesan yang ingin anda kirimkan kepada pengguna WhatsApp lain.

Untuk parameter Number Key bisa anda dapatkan juga pada halaman API Key & Apps pada section Assigned Numbers for API

request
curl --location 'https://api.watzap.id/v1/send_message' \
--header 'Content-Type: application/json' \
--data '{
    "api_key": "YOUR-API-KEY",
    "number_key": "YOUR-NUMBER-KEY",
    "phone_no": "628xxxx",
    "message": "YOUR-MESSAGE"
}'

respond
{
  "status": "200",
  "message": "Successfully",
  "ack": "successfully"
}

Endpoint ini berfungsi untuk mengirim pesan teks berserta gambar ataupun hanya gambar yang berisi konten promosi atau pesan yang akan dikirim ke Group yang anda inginkan.

Untuk parameter Number Key bisa anda dapatkan juga pada halaman API Key & Apps pada section Assigned Numbers for API

curl --location 'https://api.watzap.id/v1/send_image_group' \
--header 'Content-Type: application/json' \
--data-raw '{
    "api_key": "YOUR-API-KEY",
    "number_key": "YOUR-NUMBER-KEY",
    "group_id": "xxxxxxx@g.us",
    "url": "YOUR-PUBLIC-IMAGE-URL",
    "message": "YOUR-MESSAGE",
    "separate_caption": "(0 for No, 1 for Yes)"
}'