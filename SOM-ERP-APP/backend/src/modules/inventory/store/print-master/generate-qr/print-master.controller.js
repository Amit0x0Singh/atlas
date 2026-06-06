// --------- Generate new packs

//   fastify.post('/generate', async (req, reply) => {

const generatePacks = async (req, reply) => {
  const {
    itemCode,
    itemName,
    numberOfBags,
    packQty,
    uom,
    supplier,
    invoiceNo,
    receivedDate,
  } = req.body;

  if (!itemCode || !itemName || !numberOfBags || !packQty || !uom)
    return reply.status(400).send({
      success: false,
      error: "itemCode, itemName, numberOfBags, packQty, uom are required",
    });

  const result = await generatePackBatch({
    itemCode,
    itemName,
    numberOfBags: parseInt(numberOfBags),
    packQty: parseFloat(packQty),
    uom,
    supplier,
    invoiceNo,
    receivedDate,
  });

  return reply.status(201).send({ success: true, data: result });
};
