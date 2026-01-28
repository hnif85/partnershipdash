async function testTransactionAPI() {
  try {
    const response = await fetch('http://localhost:3000/api/transactions?page=1&limit=5&search=');
    const data = await response.json();

    console.log('API Response status:', response.status);
    console.log('Transaction count:', data.transactions?.length || 0);
    console.log('Sample transaction:');

    if (data.transactions && data.transactions.length > 0) {
      const tx = data.transactions[0];
      console.log('Transaction GUID:', tx.guid);
      console.log('Invoice:', tx.invoice_number);
      console.log('Transaction details count:', tx.transaction_details?.length || 0);
      console.log('Transaction details:');
      console.log(JSON.stringify(tx.transaction_details, null, 2));

      if (tx.transaction_details && tx.transaction_details.length > 0) {
        console.log('First product name:', tx.transaction_details[0].product_name);
      } else {
        console.log('NO PRODUCT DETAILS!');
      }
    } else {
      console.log('No transactions returned');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testTransactionAPI();
