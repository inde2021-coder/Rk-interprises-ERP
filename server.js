const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
app.use(express.json());

// Public folder ke liye (agar frontend files rkhni hon)
app.use(express.static(path.join(__dirname, 'public')));

// Auto-Tally Double Entry Accounting Schema
const JournalSchema = new mongoose.Schema({
    date: { type: Date, default: Date.now },
    branch: String,
    reference: String, 
    accountName: String, 
    entryType: String, // 'Dr' or 'Cr'
    amount: Number,
    narration: String
});
const Journal = mongoose.model('Journal', JournalSchema);

// AUTO-TALLY BILL SETTLEMENT API
app.post('/api/settle-bill', async (req, res) => {
    try {
        const { branch, billId, grossAmount, gstRate, amountPaid, customerName } = req.body;
        
        const cgst = (grossAmount * (gstRate / 2)) / 100;
        const sgst = (grossAmount * (gstRate / 2)) / 100;
        const netTotal = grossAmount + cgst + sgst;
        const balanceDue = netTotal - amountPaid;

        const entries = [];
        const ref = `INV-${billId}`;

        // 1. Credit Sales & Tax Liabilities
        entries.push({ branch, reference: ref, accountName: "Sales A/c", entryType: "Cr", amount: grossAmount, narration: `Sales to ${customerName}` });
        if(cgst > 0) entries.push({ branch, reference: ref, accountName: "CGST A/c", entryType: "Cr", amount: cgst, narration: `CGST output on ${ref}` });
        if(sgst > 0) entries.push({ branch, reference: ref, accountName: "SGST A/c", entryType: "Cr", amount: sgst, narration: `SGST output on ${ref}` });

        // 2. Debit Cash & Debtors (Due)
        if(amountPaid > 0) entries.push({ branch, reference: ref, accountName: "Cash A/c", entryType: "Dr", amount: amountPaid, narration: `Received against ${ref}` });
        if(balanceDue > 0) entries.push({ branch, reference: ref, accountName: "Customer Debtors", entryType: "Dr", amount: balanceDue, narration: `Pending due for ${ref}` });

        // Database me save karein (Agar mongoose connected ho)
        if (mongoose.connection.readyState === 1) {
            await Journal.insertMany(entries);
        }
        
        res.json({ success: true, message: "Tally Double-Entry Bookkeeping Automatic Pass Ho Gayi!", entries });
    } catch(err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Universal Enterprise ERP Server running on port ${PORT}`);
});
