# API Documentation: Get Customer List (Public)

This API endpoint allows you to retrieve a list of customer data, with various filtering and pagination options.

## Endpoint

`POST https://api-mwxmarket.mwxmarket.ai/cms-service/customer/list/public`

## Headers

| Header       | Type   | Description                                 |
| :----------- | :----- | :------------------------------------------ |
| `x-api-key`  | String | **Required**. Your API key for authentication. |
| `Content-Type` | String | **Required**. Must be `application/json`.   |

## Request Body

The request body should be a JSON object with the following structure:

```json
{
    "filter": {
        "set_guid": false,
        "guid": "d706ba46-bebe-4aa7-ae96-ec5a281fcf7a",
        "set_name": false,
        "name": "mohnaofalnurulhuda", 
        "set_email": false,
        "email": ["naylinnaung979@gmail.com", "maidaura24@gmail.com"],
        "set_date": false,
        "start_date": "2026-01-01",
        "end_date": "2026-01-27",
        "set_platform": false,
        "platform": "lms"
    },
    "limit": 1,
    "page": 1,
    "order": "created_at",
    "sort": "DESC"
}
```

### Request Body Parameters

| Parameter     | Type      | Description                                                                                               |
| :------------ | :-------- | :-------------------------------------------------------------------------------------------------------- |
| `filter`      | Object    | An object containing various filtering options. Each filter option also has a `set_` boolean to enable/disable it. |
| `filter.set_guid` | Boolean | Set to `true` to enable filtering by `guid`.                                                              |
| `filter.guid` | String    | The unique identifier of the customer to filter by. Only active if `set_guid` is `true`.                  |
| `filter.set_name` | Boolean | Set to `true` to enable filtering by `name`.                                                              |
| `filter.name` | String    | The full name of the customer to filter by. Only active if `set_name` is `true`.                          |
| `filter.set_email` | Boolean | Set to `true` to enable filtering by `email`.                                                             |
| `filter.email` | Array of String | An array of email addresses to filter by. Only active if `set_email` is `true`.                        |
| `filter.set_date` | Boolean | Set to `true` to enable filtering by creation date range.                                                 |
| `filter.start_date` | String | The start date (format: `YYYY-MM-DD`) for filtering customer creation date. Only active if `set_date` is `true`. |
| `filter.end_date` | String | The end date (format: `YYYY-MM-DD`) for filtering customer creation date. Only active if `set_date` is `true`. |
| `filter.set_platform` | Boolean | Set to `true` to enable filtering by `platform`.                                                          |
| `filter.platform` | String | The platform associated with the customer (e.g., "lms"). Only active if `set_platform` is `true`.         |
| `limit`       | Integer   | The maximum number of records to return per page.                                                         |
| `page`        | Integer   | The current page number for pagination.                                                                   |
| `order`       | String    | The field by which to order the results (e.g., `created_at`).                                            |
| `sort`        | String    | The sort order for the results. Can be `ASC` (ascending) or `DESC` (descending).                          |

## Example cURL Request

```bash
curl --location --request POST 'https://api-mwxmarket.mwxmarket.ai/cms-service/customer/list/public' \
  --header 'x-api-key: 8wHKXjrO/LtJ92zCyXHelt8gzlXKIfUDAn40/AkCf2cer7rreV4lOKdJXij42XVcCn6P4/ekaWHDkTHWEPUpHGwe' \
  --header 'Content-Type: application/json' \
  --data '{
    "filter": {
        "set_guid": false,
        "guid": "d706ba46-bebe-4aa7-ae96-ec5a281fcf7a",
        "set_name": false,
        "name": "mohnaofalnurulhuda", 
        "set_email": false,
        "email": ["naylinnaung979@gmail.com", "maidaura24@gmail.com"],
        "set_date": false,
        "start_date": "2026-01-01",
        "end_date": "2026-01-27",
        "set_platform": false,
        "platform": "lms"
    },
    "limit": 1,
    "page": 1,
    "order": "created_at",
    "sort": "DESC"
}'
```

## Example Response

```json
{
    "code": "00",
    "status": "success",
    "data": [
        {
            "guid": "634ae8f2-b8fd-4806-95da-16aa76510bfe",
            "full_name": "",
            "username": "customer-2",
            "profile_picture": null,
            "gender": null,
            "birth_date": null,
            "identity_number": null,
            "identity_img": null,
            "is_identity_verified": false,
            "bank_name": null,
            "bank_account_number": null,
            "bank_owner_name": null,
            "phone_number": "+6202",
            "is_phone_number_verified": false,
            "email": "customer2@test.id",
            "is_email_verified": false,
            "referal_code": "empty",
            "is_free_trial_use": false,
            "platform": null,
            "status": "active",
            "subscribe_list": null,
            "created_at": "2025-06-10T06:22:05.061212",
            "created_by": {
                "guid": "",
                "name": "by system"
            },
            "updated_at": null,
            "updated_by": null
        }
    ],
    "current_page": 1,
    "limit": 1,
    "total_page": 12250,
    "total_data": 12250,
    "message_en": "Success",
    "message_id": ""
}
```

### Response Body Parameters

| Parameter          | Type      | Description                                                                 |
| :----------------- | :-------- | :-------------------------------------------------------------------------- |
| `code`             | String    | A status code for the API response. "00" typically indicates success.      |
| `status`           | String    | A general status message (e.g., "success").                                 |
| `data`             | Array of Object | An array of customer objects. Each object represents a single customer. |
| `data[].guid`      | String    | The unique identifier of the customer.                                      |
| `data[].full_name` | String    | The full name of the customer.                                              |
| `data[].username`  | String    | The username of the customer.                                               |
| `data[].profile_picture` | String/null | URL to the customer's profile picture, or `null` if not available.    |
| `data[].gender`    | String/null | The gender of the customer, or `null`.                                    |
| `data[].birth_date` | String/null | The birth date of the customer, or `null`.                                |
| `data[].identity_number` | String/null | The identity number of the customer, or `null`.                           |
| `data[].identity_img` | String/null | URL to the customer's identity document image, or `null`.                 |
| `data[].is_identity_verified` | Boolean | Indicates if the customer's identity has been verified.                   |
| `data[].bank_name` | String/null | The name of the customer's bank, or `null`.                               |
| `data[].bank_account_number` | String/null | The customer's bank account number, or `null`.                          |
| `data[].bank_owner_name` | String/null | The name of the bank account owner, or `null`.                            |
| `data[].phone_number` | String    | The customer's phone number.                                                |
| `data[].is_phone_number_verified` | Boolean | Indicates if the customer's phone number has been verified.               |
| `data[].email`     | String    | The customer's email address.                                               |
| `data[].is_email_verified` | Boolean | Indicates if the customer's email has been verified.                      |
| `data[].referal_code` | String    | The customer's referral code.                                               |
| `data[].is_free_trial_use` | Boolean | Indicates if the customer has used a free trial.                          |
| `data[].platform`  | String/null | The platform associated with the customer, or `null`.                     |
| `data[].status`    | String    | The current status of the customer (e.g., "active").                        |
| `data[].subscribe_list` | Array/null | A list of subscriptions for the customer, or `null`.                      |
| `data[].created_at` | String    | Timestamp when the customer record was created (ISO 8601 format).         |
| `data[].created_by` | Object    | Information about the entity that created the customer record.            |
| `data[].created_by.guid` | String | The GUID of the creator.                                                  |
| `data[].created_by.name` | String | The name of the creator.                                                  |
| `data[].updated_at` | String/null | Timestamp when the customer record was last updated, or `null`.           |
| `data[].updated_by` | Object/null | Information about the entity that last updated the customer record, or `null`. |
| `current_page`     | Integer   | The current page number being displayed.                                  |
| `limit`            | Integer   | The maximum number of records requested per page.                         |
| `total_page`       | Integer   | The total number of pages available based on the `limit`.                 |
| `total_data`       | Integer   | The total number of customer records matching the filter criteria.        |
| `message_en`       | String    | A success message in English.                                             |
| `message_id`       | String    | A success message in Indonesian (currently empty in the example).         |

---