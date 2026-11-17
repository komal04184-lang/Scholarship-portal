const axios = require('axios');
const jwt = require('jsonwebtoken');

const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005';

const generateInternalToken = () => {
    return jwt.sign(
        { id: 'application-service', role: 'INTERNAL_SERVICE' },
        process.env.JWT_SECRET,
        { expiresIn: '2m' }
    );
};

const triggerScholarshipDisbursement = async ({
    applicationId,
    studentId,
    scholarshipId,
    amount,
    installmentNo = 1
}) => {
    const token = generateInternalToken();
    const response = await axios.post(
        `${PAYMENT_SERVICE_URL}/api/v1/payments/disburse`,
        { applicationId, studentId, scholarshipId, amount, installmentNo },
        {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 5000
        }
    );
    return response.data;
};

module.exports = { triggerScholarshipDisbursement };