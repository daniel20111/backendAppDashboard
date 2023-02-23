const { response } = require("express");
const { Traspaso } = require("../models");
const { Entrada } = require("../models");
const { Salida } = require("../models");

const obtenerTraspasos = async (req, res = response) => {
  //const { limite = 10, desde = 0 } = req.query;
  const query = { estado: true };

  const [total, traspasos] = await Promise.all([
    Traspaso.countDocuments(query),
    Traspaso.find(query)
      .populate("usuario", "nombre")
      .populate({
        path: "entradas",
        select: "producto cantidad",
        populate: { path: "producto", model: "Producto", select: "nombre" },
      })
      .populate({
        path: "salidas",
        select: "producto cantidad",
        populate: { path: "producto", model: "Producto", select: "nombre" },
      }),
    //.skip(Number(desde))
    //.limit(Number(limite)),
  ]);

  res.json({
    total,
    traspasos,
  });
};

const crearTraspaso = async (req, res = response) => {
  const { estado, usuario, ...body } = req.body;

  // Generar la data a guardar
  let total = Object.keys(body.productos).length;
  const arr = [];

  for (let index = 0; index < total; index++) {
    const data2 = {
      usuario: req.usuario._id,
      cantidad: body.productos[index].cantidad,
      producto: body.productos[index].producto,
    };

    const entrada = new Entrada(data2);
    await entrada.save();

    const salida = new Salida(data2);
    await salida.save();

    arr.push(entrada._id);
  }
  console.log(arr);

  const data = {
    usuario: req.usuario._id,
    entradas: arr,
  };

  const traspaso = new Traspaso(data);

  // Guardar DB
  const nuevaTraspaso = await traspaso.save();
  await nuevaTraspaso
    .populate("usuario", "nombre")
    .populate("usuario", "nombre")
    .populate({
      path: "entradas",
      select: "producto cantidad",
      populate: { path: "producto", model: "Producto", select: "nombre" },
    })
    .execPopulate();

  res.status(201).json(nuevaTraspaso);
};

/*const actualizarProducto = async (req, res = response) => {
  const { id } = req.params;
  const { estado, usuario, ...data } = req.body;

  data.usuario = req.usuario._id;

  const producto = await Producto.findByIdAndUpdate(id, data, { new: true });

  await producto
    .populate("usuario", "nombre")
    .populate("categoria", "nombre")
    .execPopulate();

  res.json(producto);
};

const borrarProducto = async (req, res = response) => {
  const { id } = req.params;
  const productoBorrado = await Producto.findByIdAndUpdate(
    id,
    { estado: false },
    { new: true }
  );

  res.json(productoBorrado);
};*/

module.exports = {
  obtenerTraspasos,
  crearTraspaso,
};
