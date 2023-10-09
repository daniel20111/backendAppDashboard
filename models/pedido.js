//modelo para pedido de productos hacia proveedores
const { Schema, model } = require("mongoose");

const PedidoSchema = new Schema({
	proveedor: { type: Schema.Types.ObjectId, ref: "Proveedor" },
	productos: [
		{
			producto: { type: Schema.Types.ObjectId, ref: "Producto" },
			cantidad: Number,
		},
	],
	fecha: Date,
    estado: String,
    
});
