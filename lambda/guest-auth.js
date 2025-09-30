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
        const { inviteCode } = body;

        if (!inviteCode) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Invite code is required'
                })
            };
        }

        // Query DynamoDB using Global Secondary Index
        const params = {
            TableName: process.env.TABLE_NAME,
            IndexName: 'InviteCodeIndex',
            KeyConditionExpression: 'inviteCode = :inviteCode',
            ExpressionAttributeValues: {
                ':inviteCode': inviteCode.toUpperCase()
            }
        };

        const result = await dynamodb.query(params).promise();

        if (!result.Items || result.Items.length === 0) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    error: 'Invalid invite code'
                })
            };
        }

        const guest = result.Items[0];

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                guest: {
                    guestId: guest.guestId,
                    name: guest.name,
                    attending: guest.attending,
                    plusOnes: guest.plusOnes,
                    dietaryRestrictions: guest.dietaryRestrictions,
                    rsvpSubmitted: guest.rsvpSubmitted
                }
            })
        };

    } catch (error) {
        console.error('Error authenticating guest:', error);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error'
            })
        };
    }
};