const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
    };

    try {
        // Extract user info from Cognito JWT token
        const phoneNumber = event.requestContext.authorizer.claims.phone_number;

        if (!phoneNumber) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Phone number not found in token'
                })
            };
        }

        // Query DynamoDB for existing RSVP
        const params = {
            TableName: process.env.TABLE_NAME,
            Key: {
                phoneNumber: phoneNumber.replace(/[^+\d]/g, '') // Sanitize phone number
            }
        };

        const result = await dynamodb.get(params).promise();

        if (!result.Item) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    message: 'No RSVP found for this phone number'
                })
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                data: result.Item
            })
        };

    } catch (error) {
        console.error('Error getting RSVP:', error);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error'
            })
        };
    }
};