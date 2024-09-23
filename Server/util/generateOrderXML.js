const { create } = require('xmlbuilder2');

const generateOrderXml = (order, user) => {
  // Generate a unique OrderRef (you might want to implement a more robust system)
  const orderRef = `Test-${order._id.toString()}`;

  // Create the XML structure
  const xml = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('order')
      .ele('OrderRef').txt(orderRef).up()
      .ele('Name').txt(order.user.name || 'TEST USER').up() // Assuming user.name exists
      .ele('Address').txt(order.address || 'TEST ADDRESS').up()
      .ele('Postcode').txt(order.postcode || 'TEST POST-CODE').up() // Assuming postcode exists
      .ele('Phone').txt('9999999999' || user.phone || user.altPhone).up() // Assuming phone exists
      .ele('lines');

  // Add each item in the order
  order.orderDetails.forEach(detail => {
    xml.ele('line')
      .ele('Item').txt(detail.item).up()
      .ele('Quantity').txt(detail.qty.toString()).up()
    .up();
  });

  return xml.end({ prettyPrint: true });
};

module.exports = generateOrderXml;