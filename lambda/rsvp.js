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
        // Parse the request body
        const body = JSON.parse(event.body);

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

        // Validate required fields
        const { name, attending, plusOnes = 0, dietaryRestrictions = '' } = body;

        if (!name || attending === undefined) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Missing required fields: name, attending'
                })
            };
        }

        // Sanitize input data
        const sanitizedData = {
            phoneNumber: phoneNumber.replace(/[^+\d]/g, ''), // Remove non-digit characters except +
            name: name.trim().substring(0, 100), // Limit name length
            attending: Boolean(attending),
            plusOnes: Math.max(0, Math.min(5, parseInt(plusOnes) || 0)), // Limit between 0-5
            dietaryRestrictions: dietaryRestrictions.trim().substring(0, 500), // Limit length
            updatedAt: new Date().toISOString()
        };

        // Save to DynamoDB
        const params = {
            TableName: process.env.TABLE_NAME,
            Item: sanitizedData
        };

        await dynamodb.put(params).promise();

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: 'RSVP saved successfully',
                data: sanitizedData
            })
        };

    } catch (error) {
        console.error('Error saving RSVP:', error);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error'
            })
        };
    }
};