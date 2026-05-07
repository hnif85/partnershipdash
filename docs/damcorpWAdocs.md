# Technical Specification Document

## WhatsApp Business API

### PT Dam Korporindo Digital


**Version Date Author Reviewer Description**

1.0 29 July 2024 Arfan
Nurul Hidayat

```
Initial
```
1.1 4 November
2024

```
Arfan
Nurul Hidayat
```
```
Add Flow & Catalog
```
1.2 6 November
2025

```
Arfan
Nurul Hidayat
```
```
Add doc filename on
send template
```
1. 3 23 Januari
    2026

```
Ma’ruf Nurul Hidayat Added errors response
scenarios for message
sending
```


## Table of Contents







- Table of Contents
- Topologi
- Token............................................................................................................................................................................
   - Sample Request
   - Response
      - Success (200)
      - Failed (401)
- Template
   - Template Status
   - Sending Templates
   - Create Template
      - Limitation
      - Request
      - Post Body
      - Body Properties
      - Template Components
         - Header
            - Header Text
            - Header Media
         - Body
         - Footer
         - Buttons
         - Phone Number Buttons..................................................................................................................
         - URL Buttons
         - Quick Reply Buttons
      - Response
   - Get Template
      - Request
      - Response
- Template Messages
   - Text-Based Message Templates.....................................................................................................................
      - Sample Request
      - Response
   - Media-Based Message Templates (image, document & video)
      - Sample Request image & video with link
      - Sample Request image & video with media id
      - Sample Request document with link
      - Sample Request document with media id
      - Response
   - Interactive Message Templates
      - Sample Request
      - Response
   - Authentication Templates
      - Post Body
      - Response
   - Catalog Template Messages..........................................................................................................................
      - Post Body
      - Sample Response
   - Carousel Templates
      - Post Body
      - Body Properties
      - Sample Response
   - Limited-Time Offer Templates
      - Post Body
      - Body Properties
      - Sample Response
   - Flow Template
      - Post Body
      - Sample Response
- Send Text Message (non-template)
   - Link Preview
   - Text
      - Request
      - Post Body Parameters
      - Sample Response
   - Document
      - Post Body
      - Post Body Parameters
      - Sample Response
   - Image
      - Post Body
      - Post Body Parameters
      - Sample Response
   - Video
      - Post Body
      - Post Body Parameters
      - Sample Response
   - Interactive Call-to-Action URL Button Messages
      - Post Body
      - Post Body Parameters
      - Sample Response
- Flow............................................................................................................................................................................
   - Create Flow
      - Sample Request
      - Sample Response
   - Sample Response...............................................................................................................................................
   - Upload Json
      - Sample Request
   - Publish Flow
      - Sample Request
   - Delete Flow
      - Sample Request
   - Deprecate Flow
      - Sample Request
   - Get List Flow
      - Sample Request
      - Sample Response
   - Get Flow Detail
      - Sample Request
      - Sample Response
   - Get Flow Json
      - Sample Request
- Upload Media
   - Supported Media Types
      - Audio..................................................................................................................................................................
      - Document
      - Image
      - Sticker
      - Video.................................................................................................................................................................
   - Example Request
   - Sample Request
   - Response
- Download Media
   - Request
   - Example Request
   - Sample Request
   - Response
- Add Sample Media
   - Sample Request
   - Response
- Catalog
   - Insert Product - Batch
      - Sample Request
   - Update Product - Batch
      - Sample Request
   - Get Batch Status
      - Sample Request
   - Delete Product
      - Sample Request
   - Create Product Set
      - Sample Request
   - Detail Product Set
   - Update Product Set...........................................................................................................................................
      - Sample Request
   - Delete Product Set
      - Sample Request
   - Get Catalog
      - Sample Request
   - Get Product List
      - Sample Request
   - Get Product List
      - Sample Request
- Webhook
   - Received Format
   - Property
   - Value Object
   - Messages Object
   - Statuses Objects
- Error Codes
      - Error response syntax
      - Error Response Contents
      - Error Codes
         - Authorization Errors
         - Throttling Errors
         - Integrity Errors
         - Other Errors
- Error Response
   - Invalid Parameter
      - Error Response Properties Description – Invalid Parameter :
   - Unregistered Template
      - Error Response Properties Description – Unregistered Template :
   - Missing Required Parameter
      - Error Response Properties Description – Missing Required Parameter :
   - Type Mismatch
      - Error Response Properties Description – Type Mismatch :


## Topologi



## Token............................................................................................................................................................................

### Sample Request

curl -L -X POST 'https://waba.damcorp.id/v2/users/login' \

- H 'Authorization: Basic VHJpYWwgMThM3cjcm9rJA=='

### Response

#### Success (200)

#### Failed (401)


## Template

Template Status

Based on the outcome of category validation and template review, we set or change your template's

status to one of the following values

```
● APPROVED — The template has passed template review and been approved, and can now
be sent in template messages.
● PENDING — The template passed category validation and is undergoing template review.
● REJECTED — The template failed category validation or template review. You can request
the rejected_reason field on the template to get the reason.
```
### Sending Templates

Use the Cloud API to send a template in a template message.

### Create Template

#### Limitation

```
● The message template name field is limited to 512 characters.
● The message template content field is limited to 1024 characters.
```
#### Request

POST https://graph.damcorp.id/message_templates

#### Post Body

{

"name": "<NAME>",
"category": "<CATEGORY>",

"language": "<LANGUAGE>",
"components": [<COMPONENTS>]
}


#### Body Properties

```
Placeholder Description Sample Value
```
```
<NAME>
String
```
```
Required.
Template name.
Maximum 512 characters.
```
```
order_confirmation
```
```
<CATEGORY>
Enum
```
```
Required.
```
```
Template category.
(Marketing / Utility / Authorization
```
```
UTILITY
```
```
<LANGUAGE>
Enum
```
```
Required.
```
```
Template language and locale code.
```
```
en_US
```
```
<COMPONENTS>
Array of objects
```
```
Required.
```
```
Components that make up the template.
See Template Components below.
```
```
See Template
Components below.
```
#### Template Components

Templates are composed of various text, media, and interactive components, based on your business

needs. Refer to the Template Components document for a list of all possible components and their

requirements as well as samples and example queries.

When creating a template, define its components by assigning an array of component objects to the

components property in the body of the request.

For example, here's an array containing a text body component with two variables and sample values,

a phone number button component, and a URL button component:


[
{
"type": "BODY",
"text": "Thank you for your order, {{1}}! Your confirmation number is
{{2}}. If you have any questions, please use the buttons below to contact
support. Thank you for being a customer!",
"example": {
"body_text": [
[
"Pablo","860198-230332"
]
]
}
},
{
"type": "BUTTONS",
"buttons": [
{
"type": "PHONE_NUMBER",
"text": "Call",
"phone_number": "15550051310"
},
{
"type": "URL",
"text": "Contact Support",
"url": "https://www.luckyshrub.com/support"
}
]
}
]

Refer to the Template Components document for a list of all possible components and their
requirements as well as samples and example queries.

Note that templates categorized as AUTHENTICATION have unique component requirements. See
Authentication Templates.

##### Header

Headers are optional components that appear at the top of template messages. Headers support text,

media (images, videos, documents), and locations. Templates are limited to one header component.


###### Header Text

{

"type": "HEADER",
"format": "TEXT",
"text": "<TEXT>",

# Required if <TEXT> string contains variables

"example": {
"header_text": [

"<HEADER_TEXT>"
]

}
}

Properties

```
Placeholder Description Example Value
```
<HEADER_TEXT> (^) Sample header text. Summer Sale
<TEXT> (^) Text to appear in template header when sent.
Supports 1 variable.
If the string contains a variable, you must include
the example property and a sample variable value.
60 characters maximum.
Our {{1}} is
on!

###### Header Media

Media headers can be an image, video, or a document such as a PDF.

{
"type": "HEADER",

"format": "<FORMAT>",
"example": {

"header_handle": [
"<HEADER_HANDLE>"

]
}

}


Properties

```
Placeholder Description Example Value
```
<FORMAT> (^) Indicates media asset type. Set to IMAGE, VIDEO, or
DOCUMENT.
IMAGE
<HEADER_HANDL
E>
Uploaded media asset handle. Use the Resumable
Upload API to generate an asset handle.
4::aW...

##### Body

Body components are text-only components and are required by all templates. Templates are limited

to one body component.

{
"type": "BODY",
"text": "<TEXT>",

# Required if <TEXT> string contains variables
"example": {
"body_text": [
[
<BODY_TEXT>
]
]
}
}

Properties

```
Placeholder Description Example Value
```
<BODY_TEXT> (^) Array of sample strings. Number of strings must
match the number of variables included in the
string.
"the end of
August","25OFF","25%"
<TEXT> (^) Text string. Supports multiple variables.
If the string contains variables, you must include
the example property and sample variable
values.
1024 characters maximum.
Shop now through
{{1}} and use code
{{2}} to get {{3}}
off of all
merchandise.


##### Footer

Footers are optional text-only components that appear immediately after the body component.

Templates are limited to one footer component.

{
"type": "FOOTER",
"text": "<TEXT>"
}

Properties

```
Placeholder Description Example Value
```
<TEXT> (^) Text to appear in template footer when sent.
60 characters maximum.
Use the buttons below to
manage your marketing
subscriptions

##### Buttons

Buttons are optional interactive components that perform specific actions when tapped. Templates

can have a mixture of up to 10 button components total, although there are limits to individual

buttons of the same type as well as combination limits.

##### Phone Number Buttons..................................................................................................................

Phone number buttons call the specified business phone number when tapped by the app user.

Templates are limited to one phone number button.

{

"type": "PHONE_NUMBER",
"text": "<TEXT>",
"phone_number": "<PHONE_NUMBER>"
}


Properties

```
Placeholder Description Example Value
```
<PHONE_NUMBER> (^) Alphanumeric string. Business phone number to be
(display phone number) called when the user taps
the button.
20 characters maximum.
15550051310
<TEXT> (^) Button label text.
25 characters maximum.
Call

##### URL Buttons

URL buttons load the specified URL in the device's default web browser when tapped by the app

user. Templates are limited to two URL buttons.

{
"type": "URL",
"text": "<TEXT>",
"url": "<URL>",

# Required if <URL> contains a variable
"example": [
"<EXAMPLE>"
]
}

Properties

```
Placeholder Description Example Value
```
<EXAMPLE> (^) URL of website. Supports 1 variable.
If using a variable, add sample variable property
to the end of the URL string. The URL loads in
the device's default mobile web browser when
the customer taps the button.
2000 characters maximum.
https://www.luckysh
rub.com/shop?promo=
summer
<TEXT> Button label text. Supports 1 variable. Shop Now


```
If using a variable, must include the example
property and a sample value.
```
```
25 characters maximum.
```
<URL> (^) URL of website that loads in the device's default
mobile web browser when the button is tapped
by the app user.
Supports 1 variable, appended to the end of the
URL string.
2000 characters maximum.
https://www.luckysh
rub.com/shop?promo=
{{1}}

##### Quick Reply Buttons

Quick reply buttons are custom text-only buttons that immediately message you with the specified text

string when tapped by the app user. A common use case-case is a button that allows your customer

to easily opt-out of any marketing messages.

Templates are limited to 10 quick reply buttons. If using quick reply buttons with other buttons, buttons

must be organized into two groups: quick reply buttons and non-quick reply buttons. If grouped

incorrectly, the API will return an error indicating an invalid combination.

Examples of valid groupings:

```
● Quick Reply, Quick Reply
● Quick Reply, Quick Reply, URL, Phone
● URL, Phone, Quick Reply, Quick Reply
```
Examples of invalid groupings:

```
● Quick Reply, URL, Quick Reply
● URL, Quick Reply, URL
```
When using the Cloud API or On-Premises API to send a template that has multiple quick reply

buttons, you can use the index property to designate the order in which buttons appear in the

template message.

{
"type": "QUICK_REPLY",

"text": "<TEXT>"
}


Properties

```
Placeholder Description Example Value
```
<TEXT> (^) Button label text.
25 characters maximum.
Unsubscribe

#### Response

Upon success, the API responds with the newly created template's ID, status, and category. There
are three possible outcomes:

1. We agreed with the category you designated and the template is now undergoing template
    review (status is PENDING).
2. We disagreed with the category you designated (status is REJECTED)
3. We automatically approved the template (status is APPROVED). This is only possible for
    authentication templates with one-time password buttons.

{
"id": "<ID>",
"status": "<STATUS>",
"category": "<CATEGORY>"
}

**Response Properties**

```
Placeholder Description Sample Value
```
<ID> (^) Template ID. 572279198452421
<STATUS> (^) Template status. PENDING
<CATEGORY> (^) The template category that you
designated, or that we assigned.
MARKETING


### Get Template

#### Request

curl -L

'https://graph.damcorp.id/message_templates?name={{Template_Name}}' \

- H 'Authorization: Bearer {{TOKEN}}'

#### Response

{

"data": [

{

"name": "tokoapp_dld",

"components": [

{

"type": "HEADER",

"format": "IMAGE"

},

{

"type": "BODY",

"text": "Welcome DBO Toko App versi Terbaru! Sekarang Toko Anda

dapat melakukan order bahan bangunan dengan cepat dan mudah."

}

],

"language": "id",

"status": "REJECTED",

"category": "MARKETING",

"id": "890791741748514"

}

],

"paging": {

"cursors": {

"before": "MAZDZD",

"after": "MjQZD"

}

}

}


## Template Messages

Currently, you can send the following template types:

1. Text-based message templates
2. Media-based message templates
3. Interactive message templates
4. Location-based message templates
5. Authentication templates with one-time password buttons
6. Multi-Product Message templates

### Text-Based Message Templates.....................................................................................................................

#### Sample Request

curl -X POST \
'https://waba.damcorp.id/v2/messages' \

- H 'Authorization: Bearer ACCESS_TOKEN' \
- H 'Content-Type: application/json' \
- d '{
"messaging_product": "whatsapp",

"recipient_type": "individual",
"to": "PHONE_NUMBER",

"type": "template",
"template": {

"name": "TEMPLATE_NAME",
"language": {
"code": "LANGUAGE_AND_LOCALE_CODE"

},
"components": [

{
"type": "body",

"parameters": [
{

"type": "text",
"text": "text-string"

},
{

"type": "currency",
"currency": {
"fallback_value": "VALUE",

"code": "USD",
"amount_1000": NUMBER

}


},

{
"type": "date_time",
"date_time": {

"fallback_value": "DATE"
} } ] } ] }

}'

#### Response

Use the ID listed to track your message status.

{

"messaging_product": "whatsapp",
"contacts": [{

"input": "PHONE_NUMBER",
"wa_id": "WHATSAPP_ID",

}]
"messages": [{

"id": "ID",
}]

}


### Media-Based Message Templates (image, document & video)

To reduce the likelihood of errors and avoid unnecessary requests to your public server, we
recommend that you upload your media assets and use their IDs when sending messages. You

can use either link or media ID for Media.

#### Sample Request image & video with link

curl -X POST \
'https://waba.damcorp.id/v2/messages' \

- H 'Authorization: Bearer ACCESS_TOKEN' \
- H 'Content-Type: application/json' \
- d '{
"messaging_product": "whatsapp",
"recipient_type": "individual",
"to": "PHONE_NUMBER",
"type": "template",
"template": {
"name": "TEMPLATE_NAME",
"language": {
"code": "LANGUAGE_AND_LOCALE_CODE"
},
"components": [
{
"type": "header",
"parameters": [
{
"type": "image/video",
"image": {
"link": "https://URL"
}
}
]
},
{
"type": "body",
"parameters": [
{
"type": "text",
"text": "TEXT-STRING"
},
{
"type": "currency",
"currency": {
"fallback_value": "VALUE",
"code": "USD",
"amount_1000": NUMBER
}
},
{
"type": "date_time",
"date_time": {
"fallback_value": "MONTH DAY, YEAR"
} } ] } ] }

}'


#### Sample Request image & video with media id

curl -X POST \
'https://waba.damcorp.id/v2/messages' \

- H 'Authorization: Bearer ACCESS_TOKEN' \
- H 'Content-Type: application/json' \
- d '{
"messaging_product": "whatsapp",
"recipient_type": "individual",
"to": "PHONE_NUMBER",
"type": "template",
"template": {
"name": "TEMPLATE_NAME",
"language": {
"code": "LANGUAGE_AND_LOCALE_CODE"
},
"components": [
{
"type": "header",
"parameters": [
{
"type": "image/video",
"image": {
"id": "mediaid"
}
}
]
},
{
"type": "body",
"parameters": [
{
"type": "text",
"text": "TEXT-STRING"
},
{
"type": "currency",
"currency": {
"fallback_value": "VALUE",
"code": "USD",
"amount_1000": NUMBER
}
},
{
"type": "date_time",
"date_time": {
"fallback_value": "MONTH DAY, YEAR"
} } ] } ] }

}'


#### Sample Request document with link

curl -X POST \
'https://waba.damcorp.id/v2/messages' \

- H 'Authorization: Bearer ACCESS_TOKEN' \
- H 'Content-Type: application/json' \
- d '{
"messaging_product": "whatsapp",
"recipient_type": "individual",
"to": "PHONE_NUMBER",
"type": "template",
"template": {
"name": "TEMPLATE_NAME",
"language": {
"code": "LANGUAGE_AND_LOCALE_CODE"
},
"components": [
{
"type": "header",
"parameters": [
{
"type": "document",
"document": {
"link": "https://URL",
“filename”: “file name”
}
}
]
},
{
"type": "body",
"parameters": [
{
"type": "text",
"text": "TEXT-STRING"
},
{
"type": "currency",
"currency": {
"fallback_value": "VALUE",
"code": "USD",
"amount_1000": NUMBER
}
},
{
"type": "date_time",
"date_time": {
"fallback_value": "MONTH DAY, YEAR"
} } ] } ] }

}'


#### Sample Request document with media id

curl -X POST \
'https://waba.damcorp.id/v2/messages' \

- H 'Authorization: Bearer ACCESS_TOKEN' \
- H 'Content-Type: application/json' \
- d '{
"messaging_product": "whatsapp",
"recipient_type": "individual",
"to": "PHONE_NUMBER",
"type": "template",
"template": {
"name": "TEMPLATE_NAME",
"language": {
"code": "LANGUAGE_AND_LOCALE_CODE"
},
"components": [
{
"type": "header",
"parameters": [
{
"type": "document",
"document": {
"id": "media id",
“filename”: “file name”
}
}
]
},
{
"type": "body",
"parameters": [
{
"type": "text",
"text": "TEXT-STRING"
},
{
"type": "currency",
"currency": {
"fallback_value": "VALUE",
"code": "USD",
"amount_1000": NUMBER
}
},
{
"type": "date_time",
"date_time": {
"fallback_value": "MONTH DAY, YEAR"
} } ] } ] }

}'


#### Response

Use the ID listed to track your message status.
{
"messaging_product": "whatsapp",

"contacts": [{
"input": "PHONE_NUMBER",

"wa_id": "WHATSAPP_ID",
}]

"messages": [{
"id": "ID",
}]

}


### Interactive Message Templates

Interactive message templates expand the content you can send recipients beyond the standard
message template and media messages template types to include interactive buttons using the

components object. There are two types of predefined buttons:

**Call-to-Action** — Allows your customer to call a phone number and visit a website.

**Quick Reply** — Allows your customer to return a simple text message.

#### Sample Request

curl -X POST \
'https://waba.damcorp.id/v2/messages' \

- H 'Authorization: Bearer ACCESS_TOKEN' \
- H 'Content-Type: application/json' \
- d '{

"messaging_product": "whatsapp",
"recipient_type": "individual",

"to": "PHONE_NUMBER",
"type": "template",

"template": {
"name": "TEMPLATE_NAME",

"language": {
"code": "LANGUAGE_AND_LOCALE_CODE"

},
"components": [
{

"type": "header",
"parameters": [

{
"type": "image",

"image": {
"link": "http(s)://URL"

}
}

]
},

{
"type": "body",
"parameters": [

{
"type": "text",

"text": "TEXT_STRING"
},

{
"type": "currency",

"currency": {
"fallback_value": "VALUE",

"code": "USD",


"amount_1000": NUMBER

}
},
{

"type": "date_time",
"date_time": {

"fallback_value": "MONTH DAY, YEAR"
}

}
]

},
{

"type": "button",
"sub_type": "quick_reply",

"index": "0",
"parameters": [
{

"type": "payload",
"payload": "PAYLOAD"

}
]

},
{

"type": "button",
"sub_type": "quick_reply",

"index": "1",
"parameters": [

{
"type": "payload",
"payload": "PAYLOAD"

}
]

}
]

}
}'


#### Response

Use the ID listed to track your message status.
{
"messaging_product": "whatsapp",

"contacts": [{
"input": "PHONE_NUMBER",

"wa_id": "WHATSAPP_ID",
}]

"messages": [{
"id": "ID",
}]

}


### Authentication Templates

#### Post Body

{
"messaging_product": "whatsapp",

"recipient_type": "individual",
"to": "<CUSTOMER_PHONE_NUMBER>",

"type": "template",
"template": {

"name": "<TEMPLATE_NAME>",
"language": {
"code": "<TEMPLATE_LANGUAGE_CODE>"

},
"components": [

{
"type": "body",

"parameters": [
{

"type": "text",
"text": "<ONE-TIME PASSWORD>"

}
]

},
{
"type": "button",

"sub_type": "url",
"index": "0",

"parameters": [
{

"type": "text",
"text": "<ONE-TIME PASSWORD>"

} ] } ] } }


#### Response

{

"messaging_product": "whatsapp",
"contacts": [

{
"input": "<INPUT>",

"wa_id": "<WA_ID>"
}

],
"messages": [

{
"id": "<ID>"
}

]
}

Response Content

```
Placeholder Description Sample Value
```
```
<INPUT>
String
```
```
The customer phone number that
the message was sent to. This may
not match wa_id.
```
```
+16315551234
```
```
<WA_ID>
String
```
```
WhatsApp ID of the customer who
the message was sent to. This may
not match input.
```
```
+16315551234
```
```
<ID>
String
```
```
WhatsApp message ID. You can
use the ID listed to track your
message status.
```
```
HBgLMTY1MDM4Nzk0MzkVAgARGB
I3N0EyQUJDMjFEQzZCQUMzODMA
```

### Catalog Template Messages..........................................................................................................................

#### Post Body

{

"messaging_product": "whatsapp",
"recipient_type": "individual",

"to": "<TO>",
"type": "template",

"template": {
"name": "<NAME>",

"language": {
"code": "<CODE>"

},
"components": [

/* Body component required if template uses variables, otherwise
omit */

{
"type": "body",

"parameters": [
{

"type": "<TYPE>",
"text": "<TEXT>"

}
]

},
{
"type": "button",

"sub_type": "CATALOG",
"index": 0,

"parameters": [
{

"type": "action",
"action": {

"thumbnail_product_retailer_id":
"<THUMBNAIL_PRODUCT_RETAILER_ID>"

} } ] } ] } }


Properties

```
Placeholder Description Sample Value
```
```
<CODE>
String
```
```
Required.
```
```
Template language and locale code.
```
```
en_US
```
```
<NAME>
String
```
```
Required.
```
```
Template name.
```
```
intro_catalog
_offer
```
```
<THUMBNAIL_PRODUCT
_RETAILER_ID>
String
```
```
Optional.
```
```
Item SKU number. Labeled as Content ID in the
Commerce Manager.
```
```
The thumbnail of this item will be used as the
message's header image.
```
```
If the parameters object is omitted, the product
image of the first item in your catalog will be
used.
```
```
2lc20305pt
```
```
<TEXT>
String
```
```
Required if template uses variables.
```
```
Template variable.
```
```
100
```
```
<TO>
String
```
```
Required.
```
```
Customer phone number.
```
```
+16505551234
```
```
<TYPE>
String
```
```
Required if template uses variables.
```
```
Template variable type.
```
```
text
```
#### Sample Response

{
"messaging_product": "whatsapp",

"contacts": [
{

"input": "+16505551234",
"wa_id": "16505551234"

}
],
"messages": [

{


"id": "HBgLMTY1MDM4Nzk0MzkVAgARGBI5RkEwM0EyODFEQzQ2NDYzQTMA"

}
]
}

### Carousel Templates

#### Post Body

{
"messaging_product": "whatsapp",

"recipient_type": "individual",
"to": "<TO>",

"type": "template",
"template": {

"name": "<TEMPLATE_NAME>",
"language": {

"code": "<TEMPLATE_LANGUAGE_CODE>"
},

"components": [

/* Message bubble; can omit if template message bubble has no
variables */
{

"type": "BODY",
"parameters": [

{
"type": "TEXT",

"text": "<BUBBLE_TEXT_VARIABLE>"
}

]
},

/* Carousel cards */

{
"type": "CAROUSEL",
"cards": [

/* Card one */

{
"card_index": <CARD_INDEX>,

"components": [
{

"type": "HEADER",
"parameters": [

{

/* Required if template uses image header,
otherwise omit */


"type": "IMAGE",

"image": {
"id": "<HEADER_ASSET_ID>"
}

/* Required if template uses video header,
otherwise omit */
"type": "VIDEO",

"video": {
"id": "<HEADER_ASSET_ID>"

}
}

]
},

/* Can be omitted if card body text in template has no
variables */

{
"type": "BODY",

"parameters": [
{

"type": "text",
"text": "<CARD_BODY_VARIABLE>"

}
]

},
{

"type": "BUTTON",
"sub_type": "QUICK_REPLY",
"index": "<BUTTON_INDEX>",

"parameters": [
{

"type": "PAYLOAD",
"payload": "<QUICK_REPLY_BUTTON_PAYLOAD>"

}
]

},
{

"type": "BUTTON",
"sub_type": "URL",

"index": "BUTTON_INDEX",
"parameters": [
{

"type": "PAYLOAD",
"payload": "<URL_BUTTON_PAYLOAD>"

}
]

}


]

}
]
},

/* Addt'l cards would follow, using the same structure as the
card above. Must
define a card for every card that the template uses. */

]

}
}

#### Body Properties

```
Placeholder Description Example Value
```
```
<BUBBLE_TEXT_VARIABL
E>
String
```
```
Required if the message bubble uses variables.
```
```
Message bubble text variable.
```
```
There is no maximum character limit on this
value, but counts against the message bubble
limit of 1024 characters.
```
```
20OFF
```
```
<BUTTON_INDEX>
Integer
```
```
Required.
```
```
Zero-indexed order in which button appears at
the bottom of the template message. 0 indicates
the first button, 1 indicates second button, etc.
```
```
0
```
```
<CARD_INDEX>
Integer
```
```
Required.
```
```
Zero-indexed order in which card appears within
the card carousel. 0 indicates first card, 1
indicates second card, etc.
```
```
0
```
```
<CARD_BODY_VARIABLE>
String
```
```
Required if card body text uses a variable.
```
```
Card body text variable.
```
```
There is no maximum character limit on this
value, but counts against the card body text limit
of 160 characters.
```
```
20OFF
```
```
<HEADER_ASSET_ID>
Media asset handle
```
```
Required.
242307903831
78626
```

```
Uploaded media asset ID. Use the /media
endpoint to generate an ID.
```
```
<QUICK_REPLY_BUTTON_
PAYLOAD>
String
```
```
Optional.
```
```
Value to be included in messages webhooks
(messages.button.payload) when the
button is tapped.
```
```
59NqSd
```
```
<TEMPLATE_LANGUAGE_C
ODE>
Enum
```
```
Required.
```
```
Language and locale code of the template to be
sent in the template message.
```
```
en_US
```
```
<TEMPLATE_NAME>
String
```
```
Required.
```
```
Name of the template to be sent in the template
message.
```
```
summer_carou
sel_promo_20
23
```
```
<TO>
String
```
```
Required.
```
```
Phone number of customer who the template
message should be sent to.
```
```
16505555555
```
```
<URL_BUTTON_PAYLOAD>
String
```
```
Required if the URL button uses a variable.
```
```
URL button variable value.
```
```
last_chance_
2023
```
#### Sample Response

{
"messaging_product": "whatsapp",

"contacts": [
{
"input": "16505555555",

"wa_id": "16505555555"
}

],


"messages": [

{
"id": "HBgLMTY1MDUwNzY1MjAVAgARGBI5QTNDQTVCM0Q0Q0Q2RTY3RTcA"
}

]
}

### Limited-Time Offer Templates

#### Post Body

{
"messaging_product": "whatsapp",
"recipient_type": "individual",

"to": "<CUSTOMER_PHONE_NUMBER>",
"type": "template",

"template": {
"name": "<TEMPLATE_NAME>",

"language": {
"code": "<TEMPLATE_LANGUAGE_CODE>"

},
"components": [

/* Required if template uses header, otherwise omit */

{
"type": "header",
"parameters": [

{
"type": "<HEADER_TYPE>",

"<HEADER_TYPE>": {
"id": "<HEADER_ASSET_ID>"

}
}

]
},

/* Body and params required if templates uses body params,
otherwise omit */
{
"type": "body",

"parameters": [
<BODY_VARIABLES>

]
},

/* Required if template uses offer expiration details, otherwise
omit */
{


"type": "limited_time_offer",

"parameters": [
{
"type": "limited_time_offer",

"limited_time_offer": {
"expiration_time_ms": <EXPIRATION_TIME>

}
}

]
},

/* Copy code button optional */

{
"type": "button",

"sub_type": "copy_code",
"index": 0,
"parameters": [

{
"type": "coupon_code",

"coupon_code": "<OFFER_CODE>"
}

]
},

/* Required */

{
"type": "button",

"sub_type": "url",
"index": <URL_BUTTON_INDEX>,
"parameters": [

{
"type": "text",

"text": "<URL_VARIABLE>"
}

]
}

]
}

}'

#### Body Properties

```
Placeholder Description Example Value
```
```
<BODY_VARIABLES>
Array of objects
```
```
Required if template body text uses variables.
{"type":"text","te
xt":"Pablo"},{"typ
```

```
Body text variable values. Define each
variable as an individual object.
```
```
e":"text","text":"
CARIBE25"}
```
<CUSTOMER_PHONE_
NUMBER>

_String_

```
Required.
```
```
Phone number of customer who the template
message should be sent to.
```
```
+16505555555
```
<EXPIRATION_TIME
>

_Unix timestamp_

```
Required.
```
```
Offer code expiration time as a UNIX
timestamp in milliseconds.
```
```
1698562800000
```
<HEADER_ASSET_ID
>

_Media asset ID_

```
Required.
```
```
Uploaded media asset ID. Use the /media
endpoint to generate an ID.
```
```
1602186516975000
```
<HEADER_TYPE>

_String_

```
Required.
```
```
Header type used by the template. Values
can be image or video.
```
```
image
```
<OFFER_CODE>

_String_

```
Required if template uses a copy code button.
```
```
Offer code.
```
```
Maximum 15 characters.
```
```
CARIBE25
```
<TEMPLATE_LANGUA
GE_CODE>

_Enum_

```
Required.
```
```
The template's language and locale code.
```
```
en_US
```
<TEMPLATE_NAME>

_String_

```
Required.
```
```
The template's name.
```
```
limited_time_offer
_caribbean_pkg_202
3
```
<URL_BUTTON_INDE
X>

_Integer_

```
Required.
```
```
URL button index. If the template uses a copy
code button, value must be 1.
```
```
If the template does not use a copy code
button, the value must be 0.
```
```
1
```
<URL_VARIABLE>

_String_

```
Required if URL uses a variable.
```
```
URL variable value.
```
```
n3mtql
```

```
No maximum but value counts against URL
string maximum of 2000 characters.
```
#### Sample Response

{
"messaging_product": "whatsapp",

"contacts": [
{

"input": "16505555555",
"wa_id": "16505555555"

}
],

"messages": [
{
"id": "HBgLMTY1MDUwNzY1MjAVAgARGBI5QTNDQTVCM0Q0Q0Q2RTY3RTcA"

}
]

}

### Flow Template

#### Post Body

{

"messaging_product": "whatsapp",
"recipient_type": "individual",

"to": "PHONE_NUMBER",
"type": "template",

"template": {
"name": "TEMPLATE_NAME",

"language": {
"code": "LANGUAGE_AND_LOCALE_CODE"

},
"components": [

{
"type": "button",
"sub_type": "flow",

"index": "0",
"parameters": [

{
"type": "action",

"action": {
"flow_token": "FLOW_TOKEN", //optional, default is
"unused"
"flow_action_data": {

...
} // optional, json object with the data payload for
the first screen

}


} ] } ] } }

#### Sample Response

{
"messaging_product": "whatsapp",

"contacts": [
{

"input": "<phone-number>",
"wa_id": "<phone-number>"

}
],

"messages": [
{
"id": "<message-id>"

}
]

}

## Send Text Message (non-template)

### Link Preview

You can have the WhatsApp client attempt to render a preview of the first URL in the body text

string, if it contains one. URLs must begin with [http://](http://) or https://. If multiple URLs are in

the body text string, only the first URL will be rendered.

If omitted, or if unable to retrieve a link preview, a clickable link will be rendered instead.

### Text

A text message can be a max of 4096 characters long.

#### Request

{

"messaging_product": "whatsapp",
"recipient_type": "individual",

"to": "<WHATSAPP_USER_PHONE_NUMBER>",
"type": "text",

"text": {
"preview_url": <ENABLE_LINK_PREVIEW>,


"body": "<BODY_TEXT>"

}
}

#### Post Body Parameters

```
Placeholder Description Example Value
```
```
<BODY_TEXT>
String
```
```
Required.
Message body text. Supports
URLs.
Maximum 4096 characters.
```
```
As requested, here's
the link to our latest
product:
https://www.meta.com/q
uest/quest-3/
```
```
<ENABLE_LINK_PREVIEW>
Boolean
```
```
Optional.
Set to true to have the
WhatsApp client attempt to
render a link preview of any
URL in the body text string.
See Link Preview below.
```
```
true
```
```
<WHATSAPP_USER_PHONE_N
UMBER>
String
```
```
Required.
WhatsApp user phone
number.
```
```
+16505551234
```
#### Sample Response

{
"messaging_product": "whatsapp",

"contacts": [
{

"input": "+16505551234",
"wa_id": "16505551234"

}
],

"messages": [
{

"id": "HBgLMTY0NjcwNDM1OTUVAgARGBI1RjQyNUE3NEYxMzAzMzQ5MkEA"
}
]

}

Document

#### Post Body

{

"messaging_product": "whatsapp",
"recipient_type": "individual",


"to": "<WHATSAPP_USER_PHONE_NUMBER>",

"type": "document",
"document": {
"id" : "<MEDIA_ID>", /* Only if using uploaded media */

"link": "<MEDIA_URL>", /* Only if linking to your media */
"caption": "<DOCUMENT_CAPTION>",

"filename": "<DOCUMENT_FILENAME>"
}

}

#### Post Body Parameters

```
Placeholder Description Example Value
```
```
<DOCUMENT_CAPTION>
String
```
```
Optional.
Document caption text.
```
```
Lucky Shrub Invoice
```
```
<DOCUMENT_FILENAME>
String
```
```
Optional.
Document filename, with
extension. The WhatsApp
client will use an appropriate
file type icon based on the
extension.
```
```
lucky-shrub-
invoice.pdf
```
```
<MEDIA_ID>
String
```
```
Required if using an uploaded
media asset (recommended).
Uploaded media asset ID.
```
```
430519053060512
```
```
<DOCUMENT_FILENAME>
String
```
```
Optional.
Document filename, with
extension. The WhatsApp
client will use an appropriate
file type icon based on the
extension.
```
```
lucky-shrub-
invoice.pdf
```
```
<MEDIA_URL>
String
```
```
Required if linking to your
media asset (not
recommended).
URL of image asset on your
public server. For better
performance, we recommend
that you upload your media
asset instead.
```
```
https://www.luckyshrub
.com/invoices/FmOzfD9c
Kf/lucky-shrub-
invoice.pdf.png
```
```
<WHATSAPP_USER_PHONE_N
UMBER>
String
```
```
Required.
WhatsApp user phone
number.
```
```
+16505551234
```

#### Sample Response

{

"messaging_product": "whatsapp",
"contacts": [
{

"input": "+16505551234",
"wa_id": "16505551234"

}
],

"messages": [
{

"id": "HBgLMTY0NjcwNDM1OTUVAgARGBI1RjQyNUE3NEYxMzAzMzQ5MkEA"
}

]
}

### Image

#### Post Body

#### Post Body

{

"messaging_product": "whatsapp",
"recipient_type": "individual",

"to": "<WHATSAPP_USER_PHONE_NUMBER>",
"type": "image",

"image": {
"id" : "<MEDIA_ID>", /* Only if using uploaded media */
"link": "<MEDIA_URL>", /* Only if linking to your media */

"caption": "<IMAGE_CAPTION_TEXT>"
}

}

#### Post Body Parameters

```
Placeholder Description Example Value
```
```
<IMAGE_CAPTION_TEXT>
String
```
```
Optional.
Image caption text.
Maximum 1024 characters.
```
```
The best succulent
ever?
```
```
<MEDIA_ID>
String
```
```
Required if using an uploaded
media asset (recommended).
Uploaded media asset ID.
```
```
1479537139650973
```

```
<MEDIA_URL>
String
```
```
Required if linking to your
media asset (not
recommended)
URL of image asset on your
public server. For better
performance, we recommend
that you upload your media
asset instead.
```
```
https://www.luckyshrub
.com/assets/succulents
/aloe.png
```
```
<WHATSAPP_USER_PHONE_N
UMBER>
String
```
```
Required.
WhatsApp user phone
number.
```
```
+16505551234
```
#### Sample Response

{

"messaging_product": "whatsapp",
"contacts": [

{
"input": "+16505551234",
"wa_id": "16505551234"

}
],

"messages": [
{

"id": "HBgLMTY0NjcwNDM1OTUVAgARGBI1RjQyNUE3NEYxMzAzMzQ5MkEA"
}

]
}

### Video

Video messages display a thumbnail preview of a video image with an optional caption. When the

WhatsApp user taps the preview, it loads the video and displays it to the user.

#### Post Body

{

"messaging_product": "whatsapp",
"recipient_type": "individual",
"to": "{{wa-user-phone-number}}",

"type": "video",
"video": {

"id" : "<MEDIA_ID>", /* Only if using uploaded media */
"link": "<MEDIA_URL>", /* Only if linking to your media */

"caption": "<VIDEO_CAPTION_TEXT>"
}

}


#### Post Body Parameters

```
Placeholder Description Example Value
```
```
<VIDEO_CAPTION_TEXT>
String
```
```
Optional.
Video caption text.
Maximum 1024 characters.
```
```
A succulent eclipse!
```
```
<MEDIA_ID>
String
```
```
Required if using an uploaded
media asset (recommended).
Uploaded media asset ID.
```
```
1166846181421424
```
```
<MEDIA_URL>
String
```
```
Required if linking to your
media asset (not
recommended)
URL of video asset on your
public server. For better
performance, we recommend
that you upload your media
asset instead.
```
```
https://www.luckyshrub
.com/assets/lucky-
shrub-eclipse-
viewing.mp4
```
```
<WHATSAPP_USER_PHONE_N
UMBER>
String
```
```
Required.
WhatsApp user phone
number.
```
```
+16505551234
```
#### Sample Response

{
"messaging_product": "whatsapp",

"contacts": [
{

"input": "+16505551234",
"wa_id": "16505551234"
}

],
"messages": [

{
"id": "HBgLMTY0NjcwNDM1OTUVAgARGBI1RjQyNUE3NEYxMzAzMzQ5MkEA"

}
]

}

Interactive Call-to-Action URL Button Messages

#### Post Body

{
"messaging_product": "whatsapp",

"recipient_type": "individual",


"to": "<CUSTOMER_PHONE_NUMBER>",

"type": "interactive",
"interactive": {
"type": "cta_url",

/* Header optional */

"header": {
"type": "text",

"text": "<HEADER_TEXT>"
},

/* Body optional */

"body": {
"text": "<BODY_TEXT>"

},

/* Footer optional */

"footer": {
"text": "<FOOTER_TEXT>"

},
"action": {

"name": "cta_url",
"parameters": {

"display_text": "<BUTTON_TEXT>",
"url": "<BUTTON_URL>"

}
}

}
}

#### Post Body Parameters

```
Placeholder Description Sample Value
```
```
<CUSTOMER_PHONE_NU
MBER>
String
```
```
Required.
```
```
The WhatsApp ID or phone number of the
customer the message is being sent to.
```
```
+15558543153
```
```
<HEADER_TEXT>
String
```
```
Optional.
```
```
Header text.
```
```
Available Dates
```

<BODY_TEXT>

_String_

```
Required.
```
```
Message body text.
```
```
Tap the button
below to see
available dates.
```
<FOOTER_TEXT>

_String_

```
Optional.
```
```
Message footer text.
```
```
Dates subject to
change.
```
<BUTTON_TEXT>

_String_

```
Required.
```
```
Button text.
```
```
See Dates
```
<BUTTON_URL>

_String_

```
Required.
```
```
URL to load in the device's default web
browser when tapped by the WhatsApp
user.
```
```
https://www.luckys
hrub.com?clickID=k
qDGWd24Q5TRwoEQTIC
Y7W1JKoXvaZOXWAS7h
1P76s0R7Paec4
```


#### Sample Response

{
"messaging_product": "whatsapp",

"contacts": [
{

"input": "+16505551234",
"wa_id": "16505551234"
}

],
"messages": [

{
"id": "HBgLMTY0NjcwNDM1OTUVAgARGBI1RjQyNUE3NEYxMzAzMzQ5MkEA"

}
]

}


## Flow............................................................................................................................................................................

### Create Flow

New Flows are created in DRAFT status. You can then make changes to the Flow by uploading an
updated JSON file.

#### Sample Request

curl --location 'https://graph.damcorp.id/flows/' \
--header 'Authorization: Bearer {{TOKEN-V2}}' \
--header 'Content-Type: application/json' \

--data '{
"name": "exchange register 6",

"categories": [
"SIGN_UP"

],
"endpoint_uri": "https://flow-endpoint.damcorp.id"

}'

```
Parameter Description Optional
```
```
name
```
```
string
```
```
Flow name
```

```
categories
```
```
array
```
```
A list of Flow categories. Multiple values are possible,
but at least one is required. Choose the values which
represent your business use case. The list of values:
```
```
● SIGN_UP
● SIGN_IN
● APPOINTMENT_BOOKING
● LEAD_GENERATION
● CONTACT_US
● CUSTOMER_SUPPORT
● SURVEY
● OTHER
```
```
clone_flow_id
```
```
string
```
```
ID of source Flow to clone. You must have permission
to access the specified Flow.
```
```
✓
```
```
endpoint_uri
```
```
string
```
```
The URL of the WA Flow Endpoint. Starting from Flow
JSON version 3.0 this property should be specified only
via API. Do not provide this field if you are cloning a
Flow with Flow JSON version below 3.0.
```
```
✓
```
### Sample Response...............................................................................................................................................

#### Sample Response

{

"id": "<Flow-ID>"

}


#### Sample Response

Every update request will return validation errors in the Flow JSON, if any.

{
"success": true,

"validation_errors": [
{

"error": "INVALID_PROPERTY",
"error_type": "JSON_SCHEMA_ERROR",

"message": "The property \"initial-text\" cannot be specified at
\"$root/screens/0/layout/children/2/children/0\".",
"line_start": 46,

"line_end": 46,
"column_start": 17,

"column_end": 30
}

]
}

### Upload Json

#### Sample Request

curl --location
'https://graph.damcorp.id/flows/910292587462530/assets' \

--header 'Authorization: Bearer {{TOKEN-V2}}' \
--header 'Content-Type: application/json' \

--data-binary '@/Users/damcorp/Downloads/test.json'

### Publish Flow

This request updates the status of the Flow to "PUBLISHED". You can either edit this flow in the

future and turn it back to the "DRAFT" state, or create a new flow by specifying the existing Flow ID

as the clone_flow_id parameter.

You can publish your Flow once you have ensured that:

```
● All validation errors and publishing checks have been resolved.
● The Flow meets the design principles of WhatsApp Flows
● The Flow complies with WhatsApp Terms of Service, the WhatsApp Business Messaging
Policy and, if applicable, the WhatsApp Commerce Policy
```
#### Sample Request

curl --location --request POST
'https://graph.damcorp.id/flows/778553170270164/publish' \


--header 'Authorization: Bearer {{TOKEN-V2}}' \

--data ''

### Delete Flow

While a Flow is in DRAFT status, it can be deleted. Use this request for that purpose.

#### Sample Request

#### Sample Request

#### Sample Request

curl --location --request DELETE
'https://graph.damcorp.id/flows/910292587462530' \
--header 'Authorization: Bearer {{TOKEN-V2}}' \

--data ''

### Deprecate Flow

Once a Flow is published, it cannot be modified or deleted, but can be marked as deprecated.

### Request

curl -X POST '{BASE-URL}/{FLOW-ID}/deprecate' \
--header 'Authorization: Bearer {ACCESS-TOKEN}'

### Get List Flow

To retrieve a list of Flows under a WhatsApp Business Account (WABA), use the following request.

#### Sample Request

curl --location 'https://graph.damcorp.id/flows' \
--header 'Authorization: Bearer {{TOKEN-V2}}'

#### Sample Response

{
"data": [

{
"id": "flow-1",
"name": "flow 1",

"status": "DRAFT",
"categories": [ "CONTACT_US" ],

"validation_errors": []
},

{
"id": "flow-2",

"name": "flow 2",


"status": "PUBLISHED",

"categories": [ "SURVEY" ],
"validation_errors": []
},

{
"id": "flow-3",

"name": "flow 3",
"status": "DRAFT",

"categories": [ "LEAD_GENERATION" ],
"validation_errors": []

}
],

"paging": {
"cursors": {

"before": "QVFI...",
"after": "QVFI..."
}

}
}

### Get Flow Detail

#### Sample Request

curl --location 'https://graph.damcorp.id/flows/356312947280273' \

--header 'Authorization: Bearer {{TOKEN-V2}}'

#### Sample Response

{

"id": "<Flow-ID>",
"name": "<Flow-Name>",

"status": "DRAFT",
"categories": [ "LEAD_GENERATION" ],

"validation_errors": [],
"json_version": "3.0",

"data_api_version": "3.0",
"endpoint_uri": "https://example.com",
"preview": {

"preview_url":
"https://business.facebook.com/wa/manage/flows/55000..../preview/?toke
n=b9d6.....",
"expires_at": "2023- 05 - 21T11:18:09+0000"

},
"whatsapp_business_account": {

...
},

"application": {


...

},
"health_status": {
"can_send_message": "BLOCKED",

"entities": [
{

"entity_type": "FLOW",
"id": "<Flow-ID>",

"can_send_message": "BLOCKED",
"errors": [

{
"error_code": 131000,

"error_description": "endpoint_uri: You need to set the
endpoint URI before you can send or publish a flow.",

"possible_solution":
"https://developers.facebook.com/docs/whatsapp/flows/reference/flowjso
n#top-level-flow-json-properties"

},
{

"error_code": 131000,
"error_description": "app_check: You need to connect a
Meta app to the flow before you can send or publish it.",
"possible_solution":
"https://developers.facebook.com/docs/development/create-an-app"
}

]
},

{
"entity_type": "WABA",
"id": "<WABA-ID>",

"can_send_message": "AVAILABLE"
},

{
"entity_type": "BUSINESS",

"id": "<Business-ID>",
"can_send_message": "AVAILABLE"

},
{

"entity_type": "APP",
"id": "<App-ID>",

"can_send_message": "LIMITED",
"additional_info": [
"Your app is not subscribed to the message webhook. This
means you will not receive any messages sent to your phone number."
]

}
]

}


### Get Flow Json

#### Sample Request

#### Sample Request

curl --location
'https://graph.damcorp.id/flows/1536747533562850/assets' \

--header 'Authorization: Bearer {{TOKEN-V2}}'

## Upload Media

To upload media, make a POST call to /media and include the parameters listed below. All media
files sent through this endpoint are encrypted and persist for 30 days, unless they are deleted
earlier.

```
Endpoint Authentication
```
/media (^) Developers can authenticate their API calls with the access
token generated in Login for Get Token API.
**Supported Media Types**

#### Audio

```
Audio Type Extension MIME Type Max Size
```
```
AAC .aac audio/aac 16 MB
```
```
AMR .amr audio/amr 16 MB
```
```
MP3 .mp3 audio/mpeg 16 MB
```
```
MP4 Audio .m4a audio/mp4 16 MB
```
```
OGG Audio .ogg audio/ogg (OPUS codecs only; base
audio/ogg not supported.)
```
```
16 MB
```
#### Document

```
Document Type Extension MIME Type Max Size
```
```
Text .txt text/plain 100 MB
```

```
Microsoft Excel .xlsx application/vnd.openxmlformats-
officedocument.spreadsheetml.sheet
```
```
100 MB
```
```
Microsoft Word .doc application/msword 100 MB
```
```
Microsoft Word .docx application/vnd.openxmlformats-
officedocument.wordprocessingml.docu
ment
```
```
100 MB
```
```
Microsoft PowerPoint .pptx application/vnd.openxmlformats-
officedocument.presentationml.presenta
tion
```
```
100 MB
```
```
PDF .pdf application/pdf 100 MB
```
#### Image

Images must be 8-bit, RGB or RGBA.

```
Image Type Extension MIME Type Max Size
```
```
JPEG .jpeg image/jpeg 5 MB
```
```
PNG .png image/png 5 MB
```
#### Sticker

WebP images can only be sent in sticker messages.

```
Sticker Type Extension MIME Type Max Size
```
```
Animated sticker .webp image/webp 500 KB
```
```
Static sticker .webp image/webp 100 KB
```
#### Video

Only H.264 video codec and AAC audio codec supported. Single audio stream or no audio stream

only.


### Example Request

curl -X POST 'https://waba.damcorp.id/v2/media' \

- H 'Authorization: Bearer {{TOKEN}}' \
- H 'Content-Type: {{MIME_Type}}' \
- d '@/Users/ariefpratama/Pictures/Image - Icon/profile.jpeg

Sample Request

curl -X POST 'https://waba.damcorp.id/v2/media' \

- H 'Authorization: Bearer xxxxxxxxxxxxx' \
- H 'Content-Type: image/jpeg' \
- d '@/Users/ariefpratama/Pictures/Image - Icon/profile.jpeg

Response

A successful response returns an object with the uploaded media's ID:
{

"media": [
{

"id": "<MEDIA_ID>"
}

],
"meta": {

"version": "1.5.12"
}

}

## Download Media

Request

To download media, make a GET call to your media’s URL. All media URLs expire after 5 minutes —

you need to retrieve the media URL again if it expires. If you directly click on the URL you get from a

/MEDIA/MEDIA_ID GET call, you get an access error.

```
Endpoint Description Example Value
```
/MEDIA_ID (^) You can get the ID after the media is uploaded. 1707162086690029


### Example Request

Sample request:
curl -X GET 'https://waba.damcorp.id/v2/media/{{MEDIA-ID}} \

- H 'Authorization: Bearer {{TOKEN}}' \

### Sample Request

curl -X GET 'https://waba.damcorp.id/v2/media/1707162086690029' \

- H 'Authorization: Bearer {{TOKEN}}' \

### Response

If successful, you will receive the binary data of media saved in media_file, response headers

contain a content-type header to indicate the mime type of returned data. Check supported media

types for more information.

## Add Sample Media

If you create a template with a header media, you need to put a sample on create template payload.

Use this API to put a media ID to create template Payload.

Sample Request

curl -X POST 'https://graph.damcorp.id/message_templates/upload_sample' \

- H 'Authorization: Bearer {{TOKEN}}' \
- F 'media=@"/Users/ariefpratama/Downloads/sample1.pdf"'

Response

{

"h": "<UPLOADED_FILE_HANDLE>"
}



## Catalog

### Insert Product - Batch

### Sample Request

### Sample Request

curl --location 'https://waba.damcorp.id/catalog/batch' \
--header 'Authorization: Bearer {{TOKEN-V2}}' \

--header 'Content-Type: application/json' \
--data '{
"requests": [

{
"method": "CREATE",

"retailer_id": "retailerdata2",
"data": {

"availability": "in stock",
"brand": "nila",

"category": "t-shirts",
"description": "product description",

"image_url": "https://localist-
images.azureedge.net/photos/38634324197092/original/4a37e2cbf36ca098de
ee95971abe9166a2841952.png",
"name": "sepatu lari",
"price": 100000,

"currency": "IDR",
"shipping": [

{
"country": "ID",

"region": "CA",
"service": "service",

"price_value": 18000,
"price_currency": "IDR"

}
],

"condition": "new",
"url":"https://localist-
images.azureedge.net/photos/38634324197092/original/4a37e2cbf36ca098de
ee95971abe9166a2841952.png",
"retailer_product_group_id": "product-group-1"

},
"applinks": {

"android": [{
"app_name": "Electronic Example Android",

"package": "com.electronic",
"url": "example-android://electronic"

}],
"ios": [{

"app_name": "Electronic Example iOS",


"app_store_id": 2222,

"url": "example-ios://electronic"
}]
}

}
]

}'

### Update Product - Batch

#### Sample Request

curl --location 'https://waba.damcorp.id/catalog/batch' \
--header 'Authorization: Bearer {{TOKEN-V2}}' \
--header 'Content-Type: application/json' \

--data '{
"requests": [

{
"method": "UPDATE",

"retailer_id": "retailerda",
"data": {

"availability": "out of stock"
}

}
]

}'

### Get Batch Status

#### Sample Request

curl --location
'https://waba.damcorp.id/catalog/check_batch_request_status?handle=Acy
BNfAcomzRf40z3W3IBTEj_u2r6zWkXrJBQGH7qkbIjvbyX1pRrxlT03K0JElGMAdo9EdVA
wpBpa_vxwPNQsvL' \
--header 'Authorization: Bearer {{TOKEN-V2}}'



### Delete Product

#### Sample Request

#### Sample Request

curl --location 'https://waba.damcorp.id/catalog/batch' \
--header 'Authorization: Bearer {{TOKEN-V2}}' \

--header 'Content-Type: application/json' \
--data '{

"requests": [
{

"method": "DELETE",
"retailer_id": "retailerda2"

}
]
}'

### Create Product Set

#### Sample Request

curl --location 'https://waba.damcorp.id/catalog/product_sets' \

--header 'Authorization: {{token}}' \
--header 'Content-Type: application/json' \

--data '{
"name": "nurul product set test",
"filter": {

"retailer_id": {
"is_any": ["SKU0001", "1y3tm4siby","55s66pcc4o"]

}
}

}'

### Detail Product Set

#### Sample Request

#### curl --location --globoff

#### '{{host}}/catalog/product_set_id/939476553833446?fields=[%22id%2

#### 2%2C%22filter%22%2C%22name%22%2C%22product_catalog%22%2C%22produ

#### ct_count%22%2C%22retailer_id%22]' \

#### --header 'Authorization: {{token}}'

### Update Product Set

#### Sample Request

curl --location
'https://waba.damcorp.id/catalog/product_set_id/939476553833446' \

--header 'Authorization: {{token}}' \


--header 'Content-Type: application/json' \

--data '{
"name": "nurul product set update nurul",
"filter": {

"retailer_id": {
"is_any": ["SKU0001", "1y3tm4siby"]

}
}

}'

### Delete Product Set

#### Sample Request

#### Sample Request

#### Sample Request

curl --location --request DELETE
'https://waba.damcorp.id/catalog/product_set_id/939476553833446' \
--header 'Authorization: {{token}}'

### Get Catalog

#### Sample Request

curl --location 'https://waba.damcorp.id/catalog/list' \

--header 'Authorization: {{TOKEN-V2}}'

### Get Product List

#### Sample Request

curl --location --globoff
'https://waba.damcorp.id/catalog/products?summary=true&fields=[%22cont
ent_id%22%2C%22category%22%2C%22name%22%2C%22errors%22%2C%22currency%2
2%2C%22condition%22%2C%22image_url%22%2C%22price%22%2C%22visibility%22
%2C%22error_type%22%2C%22brand%22%2C%22color%22%2C%22material%22%2C%22
origin_country%22%2C%22product_type%22%2C%22custom_data%22%2C%22retail
er_id%22%2C%22retailer_product_group_id%22%2C%22additional_variant_att
ributes%22%2C%22size%22%2C%22id%22]&limit=100' \

--header 'Authorization: Bearer {{TOKEN-V2}}' \
--header 'Content-Type: application/json'

### Get Product List

#### Sample Request

curl --location 'https://waba.damcorp.id/catalog/product_sets' \

--header 'Authorization: Bearer {{TOKEN-V2}}'


## Webhook

Webhooks to get notifications about messages your business receives. Webhooks are triggered

when a customer performs an action. Before you can start receiving notifications you will need to

create an endpoint on your server to receive notifications.

Your endpoint must be able to process two types of HTTPS requests: Verification Requests and

Event Notifications. Since both requests use HTTPs, your server must have a valid TLS or SSL

certificate correctly configured and installed. Self-signed certificates are not supported.

Received Format

All Webhooks have the following generic format:

{
"object": "whatsapp_business_account",
"entry": [{

"id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
"changes": [{

"value": {
"messaging_product": "whatsapp",

"metadata": {
"display_phone_number": "PHONE_NUMBER",

"phone_number_id": "PHONE_NUMBER_ID"
},

# specific Webhooks payload
},

"field": "messages"
}]
}]

}

Property

```
Name Description
```
```
object
string
```
```
The specific webhook a business is subscribed to. The webhook is
whatsapp_business_account.
```
entry (^) An array of entry objects. Entry objects have the following properties:


```
array of objects
● id — String. The WhatsApp Business Account ID for the business
that is subscribed to the webhook.
● changes — Array of objects. An array of change objects. Change
objects have the following properties:
● value — Object. A value object. See Value Object.
● field — String. Notification type. Value will be
messages.
```
Value Object

```
Name Description
```
```
contacts
array of objects
```
```
Array of contact objects with information for the customer who sent a
message to the business. Contact objects have the following properties:
```
```
● wa_id — String. The customer's WhatsApp ID. A business can
respond to a customer using this ID. This ID may not match the
customer's phone number, which is returned by the API as input
when sending a message to the customer.
● user_id — String. Additional unique, alphanumeric identifier for a
WhatsApp user.
● profile — Object. A customer profile object. Profile objects have
the following properties:
● name — String. The customer's name.
```
```
errors
array of objects
```
```
An array of error objects describing the error. Error objects have the
following properties, which map to their equivalent properties in API error
response payloads.
```
```
Webhooks triggered by v15.0 and older requests:
```
```
● code — Integer. Example: 130429.
● title — String. Error code title. Example: Rate limit hit.
Webhooks triggered by v16.0 and newer requests:
```
```
● code — Integer. Error code. Example: 130429.
● title — String. Error code title. Example: Rate limit hit.
● message — String. Error code message. This value is the same
as the title value. For example: Rate limit hit. Note that
the message property in API error response payloads pre-pends
this value with the a # symbol and the error code in parenthesis.
For example: (#130429) Rate limit hit.
● error_data — Object. An error data object with the following
properties:
```

```
● details — String. Describes the error. Example:
Message failed to send because there were
too many messages sent from this phone
number in a short period of time.
```
messaging_produ
ct

_string_

```
Product used to send the message. Value is always whatsapp.
```
messages

_array of objects_

```
Information about a message received by the business that is subscribed
to the webhook. See Messages Object.
```
metadata

_object_

```
A metadata object describing the business subscribed to the webhook.
Metadata objects have the following properties:
```
```
● display_phone_number — String. The phone number that is
displayed for a business.
● phone_number_id — String. ID for the phone number. A
business can respond to a message using this ID.
```
statuses

_array of objects_

```
Status object for a message that was sent by the business that is
subscribed to the webhook. See Statuses Object.
```


### Messages Object

```
Name Description
```
```
audio
object
```
```
When the messages type is set to audio, including voice messages, this
object is included in the messages object:
```
```
● id — String. ID for the audio file.
● mime_type — String. Mime type of the audio file.
```
```
button
object
```
```
When the messages type field is set to button, this object is included in
the messages object:
```
```
● payload – String. The payload for a button set up by the business
that a customer clicked as part of an interactive message.
● text — String. Button text.
```
```
context
object
```
```
Context object. Only included when a user replies or interacts with one of
your messages. Context objects can have the following properties:
```
```
● forwarded — Boolean. Set to true if the message received by
the business has been forwarded.
● frequently_forwarded — Boolean. Set to true if the message
received by the business has been forwarded more than 5 times.
● from — String. The WhatsApp ID for the customer who replied to
an inbound message.
● id — String. The message ID for the sent message for an inbound
reply.
● referred_product — Object. Referred product object
describing the product the user is requesting information about.
You must parse this value if you support Product Enquiry
Messages. See Receive Response From Customers. Referred
product objects have the following properties:
● catalog_id — String. Unique identifier of the Meta
catalog linked to the WhatsApp Business Account.
● product_retailer_id — String. Unique identifier of the
product in a catalog.
```
```
document
object
```
```
A document object. When messages type is set to document, this
object is included in the messages object. Document objects can have the
following properties:
```
```
● caption — String. Caption for the document, if provided.
● filename — String. Name for the file on the sender's device.
● sha256 — String. SHA 256 hash.
● mime_type — _String. _ Mime type of the document file.
● id — String. ID for the document.
```

errors

_array of objects_

```
An array of error objects describing the error. Error objects have the
following properties, which map to their equivalent properties in API error
response payloads.
```
```
Webhooks triggered by v15.0 and older requests:
```
```
● code — Integer. Example: 130429.
● title — String. Error code title. Example: Rate limit hit.
Webhooks triggered by v16.0 and newer requests:
```
```
● code — Integer. Error code. Example: 130429.
● title — String. Error code title. Example: Rate limit hit.
● message — String. Error code message. This value is the same as
the title value. For example: Rate limit hit. Note that the
message property in API error response payloads pre-pends this
value with the a # symbol and the error code in parenthesis. For
example: (#130429) Rate limit hit.
● error_data — Object. An error data object with the following
properties:
```
```
● details — String. Describes the error. Example:
Message failed to send because there were
too many messages sent from this phone
number in a short period of time.
```
from

_string_

```
The customer's WhatsApp ID. A business can respond to a customer using
this ID. This ID may not match the customer's phone number, which is
returned by the API as input when sending a message to the customer.
```
id

_string_

```
The ID for the message that was received by the business. You could use
messages endpoint to mark this specific message as read.
```
identity

_object_

```
An identity object. Webhook is triggered when a customer's phone number
or profile information has been updated. See messages system
identity. Identity objects can have the following properties:
```
```
● acknowledged — State of acknowledgment for the messages
system customer_identity_changed.
● created_timestamp — String. The time when the WhatsApp
Business Management API detected the customer may have
changed their profile information.
● hash — String. The ID for the messages system
customer_identity_changed
```

image

_object_

```
When messages type is set to image, this object is included in the
messages object.
```
```
● caption — String. Caption for the image, if provided.
● sha256 — String. Image hash.
● id — String. ID for the image.
● mime_type — String. Mime type for the image.
```
interactive

_object_

```
When a customer has interacted with your message, this object is included
in the messages object. Interactive objects have the following properties:
```
```
● type — Object with the following properties:
● button_reply – Sent when a customer clicks a button.
Object with the following properties:
● id — String. Unique ID of a button.
● title — String. Title of a button.
● list_reply — Sent when a customer selects an item
from a list. Object with the following properties:
● id — String. Unique ID of the selected list item.
● title — String. Title of the selected list item.
● description — String. Description of the
selected row.
```
order

_object_

```
Included in the messages object when a customer has placed an order.
Order objects have the following properties:
```
```
● catalog_id — String. ID for the catalog the ordered item belongs
to.
● text — String. Text message from the user sent along with the
order.
● product_items — Array of product item objects containing the
following fields:
● product_retailer_id — String. Unique identifier of the
product in a catalog.
● quantity — String. Number of items.
● item_price — String. Price of each item.
● currency — String. Price currency.
```
referral

_object_

```
Referral object. When a customer clicks an ad that redirects to WhatsApp,
this object is included in the messages object. Referral objects have the
following properties:
```
```
● source_url – String. The Meta URL that leads to the ad or post
clicked by the customer. Opening this url takes you to the ad
viewed by your customer.
● source_type – String. The type of the ad’s source; ad or post.
● source_id – String. Meta ID for an ad or a post.
```

```
● headline – String. Headline used in the ad or post.
● body – String. Body for the ad or post.
● media_type – String. Media present in the ad or post; image or
video.
● image_url – String. URL of the image, when media_type is an
image.
● video_url – String. URL of the video, when media_type is a
video.
● thumbnail_url – String. URL for the thumbnail, when
media_type is a video.
● ctwa_clid – String. Click ID generated by Meta for ads that click
to WhatsApp.
The referral object can be included in the following types of message: text,
location, contact, image, video, document, voice, and sticker.
```
sticker

_object_

```
When messages type is set to sticker, this object is included in the
messages object. Sticker objects have the following properties:
```
```
● mime_type – String. image/webp.
● sha256 – String. Hash for the sticker.
● id – String. ID for the sticker.
● animated – Boolean. Set to true if the sticker is animated;
false otherwise.
```
system

_object_

```
When messages type is set to system, a customer has updated their
phone number or profile information, this object is included in the
messages object. System objects have the following properties:
```
```
● body – String. Describes the change to the customer's identity or
phone number.
● identity – String. Hash for the identity fetched from server.
● new_wa_id – String. New WhatsApp ID for the customer when
their phone number is updated. Available on webhook versions
v11.0 and earlier.
● wa_id – String. New WhatsApp ID for the customer when their
phone number is updated. Available on webhook versions v12.0
and later.
● type – String. Type of system update. Will be one of the following:.
● customer_changed_number – A customer changed their
phone number.
● customer_identity_changed – A customer changed
their profile information.
● customer – String. The WhatsApp ID for the customer prior to the
update.
```
text

_object_

```
When messages type is set to text, this object is included. Text objects
have the following properties:
```

```
● body — String. The text of the message.
```
timestamp

_string_

```
Unix timestamp indicating when the WhatsApp server received the
message from the customer.
```
type

_string_

```
The type of message that has been received by the business that has
subscribed to Webhooks. Possible value can be one of the following:
```
```
● audio
● button
● docum
ent
● text
● image
```
```
● interactive
● order
● sticker
● system – for customer number change messages
● unknown
●^ video^
```
video

_object_

```
When messages type is set to video, this object is included in
messages object. Video objects have the following properties:
```
```
● caption – String. The caption for the video, if provided.
● filename – String. The name for the file on the sender's device.
● sha256 – String. The hash for the video.
● id – String. The ID for the video.
● mime_type – String. The mime type for the video file.
```


### Statuses Objects

```
Name Description
```
```
biz_opaque_callbac
k_data
string
```
```
Arbitrary string included in sent message. See Message object.
```
```
conversation
object
```
```
Information about the conversation.
id – Represents the ID of the conversation the given status
notification belongs to.
origin object – Describes conversation category
type – Indicates conversation category. This can also be referred to
as a conversation entry point
authentication – Indicates the conversation was opened by a
business sending template categorized as AUTHENTICATION to the
customer. This applies any time it has been more than 24 hours since
the last customer message.
marketing – Indicates the conversation was opened by a business
sending template categorized as MARKETING to the customer. This
applies any time it has been more than 24 hours since the last
customer message.
utility – Indicates the conversation was opened by a business
sending template categorized as UTILITY to the customer. This
applies any time it has been more than 24 hours since the last
customer message.
service – Indicates that the conversation opened by a business
replying to a customer within a customer service window.
referral_conversion – Indicates a free entry point conversation.
expiration_timestamp – Date when the conversation expires.
This field is only present for messages with a `status` set to `sent`.
```
##### Authorization Errors

```
array of objects
```
```
An array of error objects describing the error. Error objects have the
following properties, which map to their equivalent properties in API
error response payloads.
```
```
Webhooks triggered by v15.0 and older requests:
```
```
● code — Integer. Example: 130429.
● title — String. Error code title. Example: Rate limit
hit.
Webhooks triggered by v16.0 and newer requests:
```
```
● code — Integer. Error code. Example: 130429.
● title — String. Error code title. Example: Rate limit
hit.
```

```
● message — String. Error code message. This value is the
same as the title value. For example: Rate limit hit.
Note that the message property in API error response
payloads pre-pends this value with the a # symbol and the
error code in parenthesis. For example: (#130429) Rate
limit hit.
● error_data — Object. An error data object with the
following properties:
● details — String. Describes the error. Example: Message
failed to send because there were too many
messages sent from this phone number in a
short period of time.
```
id _string_ The ID for the message that the business that is subscribed to the
webhooks sent to a customer

pricing _object_ An object containing pricing information.
billable – Indicates if the given message or conversation is
billable. Default is true for all conversations, including those inside
your free tier limit, except those initiated from free entry points. Free
entry point conversatsion are not billable, false. You will not be
charged for free tier limit conversations, but they are considered
billable and will be reflected on your invoice. Deprecated. Visit the
WhatsApp Changelog for more information.
category – Indicates the conversation category:
authentication – Indicates an authentication conversation.
authentication-international – Indicates an authentication-
international conversation.
marketing – Indicates an marketing conversation.
utility – Indicates a utility conversation.
service – Indicates an service conversation.
referral_conversion – Indicates a free entry point conversation.
pricing_model – Type of pricing model used by the business.
Current supported value is CBP

```
See Conversations for more information about conversations and
conversation categories.
```
recipient_id _string_ The customer's WhatsApp ID. A business can respond to a customer
using this ID. This ID may not match the customer's phone number,
which is returned by the API as input when sending a message to
the customer.

status _string_ delivered – A webhook is triggered when a message sent by a
business has been delivered
read – A webhook is triggered when a message sent by a business
has been read


```
sent – A webhook is triggered when a business sends a message to
a customer
```
```
timestamp Unix
timestamp
```
```
Date for the status message
```
## Error Response

#### Error response syntax

{
"error": {
"message": "<MESSAGE>",

"type": "<TYPE>",
"code": <CODE>,

"error_data": {
"messaging_product": "whatsapp",

"details": "<DETAILS>"
},

"error_subcode": <ERROR_SUBCODE>
"fbtrace_id": "<FBTRACE_ID>"

}
}

#### Error Response Contents

```
Property Value Type Description
```
code (^) Integer Error code. We recommend that you build your app's error
handling around error codes instead of subcodes or HTTP
response status codes.
details (^) String Error description and a description of the most likely reason for the
error. May also contain information on how to address the error,
such as which parameter is invalid or what values are acceptable.
error_subcode (^) Integer Deprecated. Will not be returned in v16.0+ responses.
Graph API subcode. Not all responses will include a subcode, so
we recommend that you build your error handling logic around
code and details properties instead.


fbtrace_id (^) String Trace ID you can include when contacting Direct Support. The ID
may help us debug the error.
message (^) String Combination of the error code and its title. For example:
(#130429) Rate limit hit.
messaging_produ
ct
String Messaging product. This will always be the string whatsapp for
Cloud API responses.
type (^) String Error type.

## Error Codes

##### Throttling Errors

```
Code Description Possible Solutions
```
```
HTTP
Status
Code
```
```
0
AuthException
```
```
We were unable to
authenticate the
app user.
```
```
Typically this means the included access token
has expired, been invalidated, or the app user
has changed a setting to prevent all apps from
accessing their data. We recommend that you
get a new access token.
```
```
401
Unauthorized
```
```
3
API Method
```
```
Capability or
permissions issue.
```
```
Use the access token debugger to verify that
your app has been granted the permissions
required by the endpoint. See Troubleshooting.
```
```
500
Internal
Server Error
```
```
10
Permission
Denied
```
```
Permission is either
not granted or has
been removed.
```
```
Use the access token debugger to verify that
your app has been granted the permissions
required by the endpoint. See Troubleshooting.
Ensure that the phone number used to set the
business public key is allowlisted.
```
```
403
Forbidden
```
```
190
Access token
has expired
```
```
Your access token
has expired.
```
```
Get a new access token. 401
Unauthorized
```
```
200 - 299
API Permission
```
```
Permission is either
not granted or has
been removed.
```
```
Use the access token debugger to verify that
your app has been granted the permissions
required by the endpoint. See Troubleshooting.
```
```
403
Forbidden
```
##### Integrity Errors

```
Code Description Possible Solutions
```
```
HTTP
Status
Code
```

4

API Too
Many
Calls

```
The app has reached its API call
rate limit.
```
```
Load the app in the App Dashboard and
view the Application Rate Limit section
to verify that the app has reached its
rate limit. If it has, try again later or
reduce the frequency or amount of API
queries the app is making.
```
```
400
Bad Request
```
80007

Rate limit
issues

```
The WhatsApp Business Account
has reached its rate limit.
```
```
See WhatsApp Business Account Rate
Limits. Try again later or reduce the
frequency or amount of API queries the
app is making.
```
```
400
Bad Request
```
130429

Rate limit
hit

```
Cloud API message throughput
has been reached.
```
```
The app has reached the API's
throughput limit. See Throughput. Try
again later or reduce the frequency with
which the app sends messages.
```
```
400
Bad Request
```
131048

Spam rate
limit hit

```
Message failed to send because
there are restrictions on how
many messages can be sent
from this phone number. This
may be because too many
previous messages were blocked
or flagged as spam.
```
```
Check your quality status in the
WhatsApp Manager and see the
Quality-Based Rate Limits
documentation for more information.
```
```
400
Bad Request
```
131056

(Business
Account,
Consumer
Account)
pair rate
limit hit

```
Too many messages sent from
the sender phone number to the
same recipient phone number in
a short period of time.
```
```
Wait and retry the operation, if you
intend to send messages to the same
phone number. You can still send
messages to a different phone number
without waiting
```
```
400
Bad Request
```
133016

Account
register
deregister
rate limit
exceeded

```
Registration or Deregistration
failed because there were too
many attempts for this phone
number in a short period of time
```
```
The business phone number is being
blocked because it has reached its
registration/deregistration attempt limit.
Try again once the number is
unblocked. See "Limitations" in the
Registration document.
```
```
400
Bad Request
```
##### Other Errors

```
Code Description Possible Solutions
```
```
HTTP
Status
Code
```
368

Temporaril
y blocked

```
The WhatsApp Business
Account associated with the app
```
```
See the Policy Enforcement document to
learn about policy violations and how to
resolve them.
```
```
403
Forbidden
```

```
for policies
violations
```
```
has been restricted or disabled
for violating a platform policy.
```
```
131031
Account
has been
locked
```
```
The WhatsApp Business
Account associated with the app
has been restricted or disabled
for violating a platform policy, or
we were unable to verify data
included in the request against
data set on the WhatsApp
Business Account (e.g, the two-
step pin included in the request
is incorrect).
```
```
See the Policy Enforcement document to
learn about policy violations and how to
resolve them.
```
```
You can also use the Health Status API,
which may provide additional insight into
the reason or reasons for the account lock.
```
```
403
Forbidden
```
Other Errors

```
Code Description Possible Solutions
```
```
HTTP
Status
Code
```
```
1
API Unknown
```
```
Invalid request or possible server
error.
```
```
Check the WhatsApp Business
Platform Status page to see API
status information. If there are no
server outages, check the endpoint
reference and verify that your request
is formatted correctly and meets all
endpoint requirements.
```
```
400
Bad
Request
```
```
2
API Service
```
```
Temporary due to downtime or
due to being overloaded.
```
```
Check the WhatsApp Business
Platform Status page to see API
status information before trying again.
```
```
503
Service
Unavailable
```
```
33
Parameter
value is not
valid
```
```
The business phone number has
been deleted.
```
```
Verify that the business phone
number is correct.
```
```
400
Bad
Request
```
```
100
Invalid
parameter
```
```
The request included one or more
unsupported or misspelled
parameters.
```
```
See the endpoint's reference to
determine which parameters are
supported and how they are spelled.
Ensure when setting the business
public key, it is a valid 2048-bit RSA
public key in PEM format.
Ensure there is no mismatch between
the phone number id you are
registering and a previously stored
phone number id.
Ensure your parameter is under any
length restriction for the type.
```
```
400
Bad
Request
```

130472

User's
number is
part of an
experiment

```
Message was not sent as part of
an experiment.
```
```
See Marketing Message Experiment. 400
Bad
Request
```
131000

Something
went wrong

```
Message failed to send due to an
unknown error.
When setting a business public
key, it either failed to calculate the
signature, call the GraphQL
endpoint, or the GraphQL
endpoint returned an error.
```
```
Try again. If the error persists, open a
Direct Support ticket.
```
```
500
Internal
Server Error
```
131005

Access
denied

```
Permission is either not granted
or has been removed.
```
```
Use the access token debugger to
verify that your app has been granted
the permissions required by the
endpoint. See Troubleshooting.
```
```
403
Forbidden
```
131008

Required
parameter is
missing

```
The request is missing a required
parameter.
```
```
See the endpoint's reference to
determine which parameters are
required.
```
```
400
Bad
Request
```
131009

Parameter
value is not
valid

```
One or more parameter values
are invalid.
```
```
See the endpoint's reference to
determine which values are supported
for each parameter, and see Phone
Numbers to learn how to add a phone
number to a WhatsApp Business
Account.
```
```
400
Bad
Request
```
131016

Service
unavailable

```
A service is temporarily
unavailable.
```
```
Check the WhatsApp Business
Platform Status page to see API
status information before trying again.
```
```
500
Internal
Server Error
```
131021

Recipient
cannot be
sender

```
Sender and recipient phone
number is the same.
```
```
Send a message to a phone number
different from the sender.
```
```
400
Bad
Request
```

131026

Message
Undeliverable

```
Unable to deliver message.
Reasons can include:
● The recipient phone
number is not a
WhatsApp phone number.
● Sending an authentication
template to a WhatsApp
user who has a +91
country calling code
(India). Authentication
templates currently
cannot be sent to
WhatsApp users in India.
● Recipient has not
accepted our new Terms
of Service and Privacy
Policy.
● Recipient using an old
WhatsApp version; must
use the following
WhatsApp version or
greater:
● Android:
2.21.15.15
● SMBA: 2.21.15.15
● iOS: 2.21.170.4
● SMBI: 2.21.170.4
● KaiOS: 2.2130.10
● Web: 2.2132.6
● The message was not
delivered to create a high
quality user experience.
See Per-User Marketing
Template Message
Limits.
```
```
Using a non-WhatsApp
communication method, ask the
WhatsApp user to:
● Confirm that they can actually
send a message to your
WhatsApp business phone
number.
● Confirm that they have
accepted our latest Terms of
Service (Settings > Help, or
Settings > Application
information will prompt them to
accept the latest
terms/policies if they haven't
done so already)
● Update to the latest version of
the WhatsApp client.
```
```
400
Bad
Request
```
131042

Business
eligibility
payment
issue

```
There was an error related to
your payment method.
```
```
See About Billing For Your WhatsApp
Business Account and verify that you
have set up billing correctly.
Common problems:
● Payment account is not
attached to a WhatsApp
Business Account
● Credit line is over the limit
● Credit line (Payment Account)
not set or active
● WhatsApp Business Account
is deleted
● WhatsApp Business Account
is suspended
```
```
400
Bad
Request
```

```
● Timezone not set
● Currency not set
● MessagingFor request (On
Behalf Of) is pending or
declined
● Exceeded conversation free
tier threshold without a valid
payment method
```
131045

Incorrect
certificate

```
Message failed to send due to a
phone number registration error.
```
```
Register the phone number before
trying again.
```
```
500
Internal
Server Error
```
131047

Re-
engagement
message

```
More than 24 hours have passed
since the recipient last replied to
the sender number.
```
```
Send the recipient a business-initiated
message using a message template
instead.
```
```
400
Bad
Request
```
131051

Unsupported
message
type

```
Unsupported message type. See Messages for supported
message types before trying again
with a supported message type.
```
```
400
Bad
Request
```
131052

Media
download
error

```
Unable to download the media
sent by the user.
```
```
We were unable to download the
media for one or more reasons, such
as an unsupported media type. Refer
to the
error.error_data.details value
for more information about why we
were unable to download the media.
```
```
Ask the WhatsApp user to send you
the media file using a non-WhatsApp
method.
```
```
400
Bad
Request
```
131053

Media upload
error

```
Unable to upload the media used
in the message.
```
```
We were unable to upload the media
for one or more reasons, such as an
unsupported media type. Refer to the
error.error_data.details value
for more information about why we
were unable to upload the media.
```
```
We recommend that you inspect any
media files that are causing errors and
confirm that they are in fact supported.
```
```
For example, in UNIX you can use file
inspection via the command line to
determine its MIME type:
```
```
400
Bad
Request
```

```
file -I rejected-file.mov
```
```
You can then confirm if its MIME type
is listed in our list of supported media
types.
```
```
For more reliable performance when
sending media, refer to Media HTTP
Caching and uploading the media.
```
131057

Account in
maintenance
mode

```
Buiness Account is in
maintenance mode
```
```
The WhatsApp Business Account is in
maintenance mode. One reason for
this could be that the account is
undergoing a throughput upgrade.
```
```
500
Bad
Request
```
132000

Template
Param Count
Mismatch

```
The number of variable
parameter values included in the
request did not match the number
of variable parameters defined in
the template.
```
```
See Message Template Guidelines
and make sure the request includes
all of the variable parameter values
that have been defined in the
template.
```
```
400
Bad
Request
```
132001

Template
does not exist

```
The template does not exist in the
specified language or the
template has not been approved.
```
```
Make sure your template has been
approved and the template name and
language locale are correct. Please
ensure you follow message template
guidelines.
```
```
404
Not Found
```
132005

Template
Hydrated
Text Too
Long

```
Translated text is too long. Check the WhatsApp Manager to
verify that your template has been
translated. See Quality Rating and
Template Status.
```
```
400
Bad
Request
```
132007

Template
Format
Character
Policy
Violated

```
Template content violates a
WhatsApp policy.
```
```
See Rejection Reasons to determine
possible reasons for violation.
```
```
400
Bad
Request
```
132012

Template
Parameter
Format
Mismatch

```
Variable parameter values
formatted incorrectly.
```
```
The variable parameter values
included in the request are not using
the format specified in the template.
See Message Template Guidelines.
```
```
400
Bad
Request
```
132015

Template is
Paused

```
Template is paused due to low
quality so it cannot be sent in a
template message.
```
```
Edit the template to improve its quality
and try again once it is approved.
```
```
400
Bad
Request
```

132016

Template is
Disabled

```
Template has been paused too
many times due to low quality and
is now permanently disabled.
```
```
Create a new template with different
content.
```
```
400
Bad
Request
```
132068

Flow is
blocked

```
Flow is in blocked state. Correct the Flow 400
Bad
Request
```
132069

Flow is
throttled

```
Flow is in throttled state and 10
messages using this flow were
already sent in the last hour.
```
```
Correct the Flow 400
Bad
Request
```
133000

Incomplete
Deregistratio
n

```
A previous deregistration attempt
failed.
```
```
Deregister the number again before
registering.
```
```
500
Internal
Server Error
```
133004

Server
Temporarily
Unavailable

```
Server is temporarily unavailable. Check the WhatsApp Business
Platform Status page to see API
status information and check the
response details value before
trying again.
```
```
503
Service
Unavailable
```
133005

Two step
verification
PIN
Mismatch

```
Two-step verification PIN
incorrect.
```
```
Verify that the two-step verification
PIN included in the request is correct.
```
```
To reset the two-step verification PIN:
```
1. Disable two-step verification.
2. Send a POST request that
    includes the new PIN to the
    Phone Number endpoint.

```
400
Bad
Request
```
133006

Phone
number re-
verification
needed

```
Phone number needs to be
verified before registering.
```
```
Verify the phone number before
registering it.
```
```
400
Bad
Request
```
133008

Too Many
two step
verification
PIN Guesses

```
Too many two-step verification
PIN guesses for this phone
number.
```
```
Try again after the amount of time
specified in the details response
value.
```
```
400
Bad
Request
```
133009

Two step
verification
PIN Guessed
Too Fast

```
Two-step verification PIN was
entered too quickly.
```
```
Check the details response value
before trying again.
```
```
400
Bad
Request
```

```
133010
Phone
number Not
Registered
```
```
Phone number not registered on
the WhatsApp Business Platform.
```
```
Register the phone number before
trying again.
```
```
400
Bad
Request
```
```
133015
Please wait a
few minutes
before
attempting to
register this
phone
number
```
```
The phone number you are
attempting to register was
recently deleted, and deletion has
not yet completed.
```
```
Wait 5 minutes before re-trying the
request.
```
```
400
Bad
Request
```
```
135000
Generic user
error
```
```
Message failed to send because
of an unknown error with your
request parameters.
```
```
See the endpoint's reference to
determine if you are querying the
endpoint using the correct syntax.
Contact customer support if you
continue receiving this error code in
response.
```
```
400
Bad
Request
```
## Error Response

#### This error response is used as part of negative testing to ensure that parameter validation

#### and error handling mechanisms are functioning correctly and return consistent and

#### informative error responses.

### Invalid Parameter

#### The system is expected to reject the request and return an error response indicating that

#### the provided parameter is invalid. The response must include a clear error message,

#### appropriate error code, and detailed error information.

{

"error": {

"message": "(#132000) Number of parameters does not match the expected
number of params",

"type": "OAuthException",

"code": 132000,

"error_data": {

"messaging_product": "whatsapp",


"details": "body: number of localizable_params (1) does not match the
expected number of params (2)"

},

"fbtrace_id": "AKzvEtYnSgbFzYQ1G41-kgx"

},

"errors": [

{

"code": 132000,

"title": "(#132000) Number of parameters does not match the expected
number of params",

"details": "body: number of localizable_params (1) does not match the
expected number of params (2)"

}

],

"meta": {

"version": "1.5.32"

}

}

#### Error Response Properties Description – Invalid Parameter :

#### Property Value Type Description

#### Error Codes

#### Contains detailed

#### information about the error

#### that occurred during

#### message sending.

#### errors Array of Object

#### A simplified list of error

#### details used for error

#### summary and validation

#### purposes.

#### meta Object

#### Contains metadata

#### information related to the

#### API response.


#### error.message String

#### Human-readable error

#### message describing the

#### reason for the failure.

#### error.type String

#### Type or category of the error

#### returned by the API.

#### error.code Integer

#### Numeric error code

#### representing the specific

#### error condition.

#### error.error_data Object

#### Additional data providing

#### more detailed error context.

#### error.fbtrace_id String

#### Unique identifier used for

#### tracing and debugging the

#### request.

#### error.error_data.messaging_product String

#### Messaging platform

#### associated with the error

#### (e.g., WhatsApp).

#### error.error_data.details String

#### Detailed explanation of the

#### error, including the specific

#### validation failure.

#### errors[].code Integer

#### Error code corresponding to

#### the failure scenario.

#### errors[].title String

#### Short title or summary of

#### the error.

#### errors[].details String

#### Detailed description

#### explaining the cause of the

#### error.

#### meta.version String

#### API version used when

#### processing the request.


### Unregistered Template

#### The system is expected to reject the request and return an error response with error code 725 ,

#### indicating that the template is not bound yet. The response must include a clear error title and

#### details, along with API version information.

{

"errors": [

{

"code": 725,

"title": "Template is not bound yet",

"details": "Template is not bound yet"

}

],

"meta": {

"version": "1.5.32"

}

}

#### Error Response Properties Description – Unregistered Template :

#### Property Value Type Description

#### errors Array of Object

#### Contains a list of error objects returned when

#### the request fails.

#### errors[].code Integer

#### Numeric error code indicating that the template

#### is not registered or not bound.

#### errors[].title String Short title describing the error condition.

#### errors[].details String

#### Detailed explanation stating that the template is

#### not bound yet.

#### meta.version String API version used when processing the request.


### Missing Required Parameter

#### The system is expected to reject the request and return an error response with error code

#### 131008 , indicating that a required parameter is missing. The response must include a clear

#### error message, detailed error information, and API version data.

{

"error": {

"message": "(#131008) Required parameter is missing",

"type": "OAuthException",

"code": 131008,

"error_data": {

"messaging_product": "whatsapp",

"details": "Parameter of type text is missing text value"

},

"fbtrace_id": "ArxK3d6YKaDYYigM3EGXdbo"

},

"errors": [

{

"code": 131008,

"title": "(#131008) Required parameter is missing",

"details": "Parameter of type text is missing text value"

}

],

"meta": {

"version": "1.5.32"

}

}


#### Error Response Properties Description – Missing Required Parameter :

#### Property Value Type Description

#### error Object

#### Contains detailed

#### information about the error

#### that occurred due to a

#### missing required parameter.

#### error.message String

#### Human-readable error

#### message indicating that a

#### required parameter is

#### missing.

#### error.type String

#### Type or category of the error

#### returned by the API.

#### error.code Integer

#### Numeric error code

#### representing a missing

#### mandatory parameter.

#### error.error_data Object

#### Additional data providing

#### detailed context about the

#### missing parameter.

#### error.error_data.messaging_product String

#### Messaging platform

#### associated with the error

#### (e.g., WhatsApp).

#### error.error_data.details String

#### Detailed explanation

#### specifying which parameter

#### value is missing.

#### error.fbtrace_id String

#### Unique identifier used for

#### request tracing and

#### debugging.

#### errors

#### Array of

#### Object

#### Contains a summarized list of

#### error information for the

#### failed request.

#### errors[].code Integer

#### Error code indicating a

#### required parameter is

#### missing.

#### errors[].title String

#### Short title describing the

#### missing parameter error.


#### errors[].details String

#### Detailed description

#### explaining the missing

#### parameter condition.

#### meta.version String

#### API version used when

#### processing the request.

### Type Mismatch

#### The system is expected to reject the request and return an error response with error code

#### 100 , indicating an invalid parameter due to a message type mismatch. The response must

#### include a clear error message, detailed error information, and API version data.

{

"error": {

"message": "(#100) Invalid parameter",

"type": "OAuthException",

"code": 100,

"error_data": {

"messaging_product": "whatsapp",

"details": "Parameter 'text' is mandatory for type 'text'"

},

"fbtrace_id": "AdLqWTim2hIZAiNSUpggTQh"

},

"errors": [

{

"code": 100,

"title": "(#100) Invalid parameter",

"details": "Parameter 'text' is mandatory for type 'text'"

}

],

"meta": {

"version": "1.5.32"


}

}

#### Error Response Properties Description – Type Mismatch :

#### Property Value Type Description

#### error Object

#### Contains detailed information

#### about the error caused by an

#### incompatible message type.

#### error.message String

#### Human-readable error

#### message indicating an invalid

#### parameter for the specified

#### message type.

#### error.type String

#### Type or category of the error

#### returned by the API.

#### error.code Integer

#### Numeric error code

#### representing a type mismatch

#### or invalid parameter.

#### error.error_data Object

#### Additional data providing

#### detailed context about the

#### missing or incompatible

#### parameter.

#### error.error_data.messaging_product String

#### Messaging platform associated

#### with the error.

#### error.error_data.details String

#### Detailed explanation specifying

#### which parameter is mandatory

#### for the given message type.

#### error.fbtrace_id String

#### Unique identifier used for

#### request tracing and debugging.

#### errors

#### Array of

#### Object

#### Contains a summarized list of

#### error information for the failed

#### request.

#### errors[].code Integer

#### Error code indicating an invalid

#### parameter due to type

#### mismatch.


#### errors[].title String

#### Short title describing the type

#### mismatch error.

#### errors[].details String

#### Detailed description explaining

#### the type mismatch condition.

#### meta.version String

#### API version used when

#### processing the request.


