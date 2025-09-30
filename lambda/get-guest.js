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
        const guestId = event.queryStringParameters?.guestId;

        if (!guestId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Guest ID is required'
                })
            };
        }

        // Query DynamoDB for guest data
        const params = {
            TableName: process.env.TABLE_NAME,
            Key: { guestId }
        };

        const result = await dynamodb.get(params).promise();

        if (!result.Item) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    error: 'Guest not found'
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
        console.error('Error getting guest:', error);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error'
            })
        };
    }
};