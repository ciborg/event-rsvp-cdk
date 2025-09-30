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
        const body = JSON.parse(event.body);
        const { guestId, attending, plusOnes = 0, dietaryRestrictions = 'None' } = body;

        if (!guestId || attending === undefined) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Missing required fields: guestId, attending'
                })
            };
        }

        // Sanitize input data
        const sanitizedData = {
            attending: Boolean(attending),
            plusOnes: Math.max(0, Math.min(5, parseInt(plusOnes) || 0)),
            dietaryRestrictions: dietaryRestrictions.trim().substring(0, 100),
            rsvpSubmitted: true,
            updatedAt: new Date().toISOString()
        };

        // Update guest in DynamoDB
        const params = {
            TableName: process.env.TABLE_NAME,
            Key: { guestId },
            UpdateExpression: 'SET attending = :attending, plusOnes = :plusOnes, dietaryRestrictions = :dietaryRestrictions, rsvpSubmitted = :rsvpSubmitted, updatedAt = :updatedAt',
            ExpressionAttributeValues: {
                ':attending': sanitizedData.attending,
                ':plusOnes': sanitizedData.plusOnes,
                ':dietaryRestrictions': sanitizedData.dietaryRestrictions,
                ':rsvpSubmitted': sanitizedData.rsvpSubmitted,
                ':updatedAt': sanitizedData.updatedAt
            },
            ReturnValues: 'ALL_NEW'
        };

        const result = await dynamodb.update(params).promise();

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: 'RSVP updated successfully',
                data: result.Attributes
            })
        };

    } catch (error) {
        console.error('Error updating RSVP:', error);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error'
            })
        };
    }
};