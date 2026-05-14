from pycoral.utils.edgetpu import make_interpreter, list_edge_tpus

print("TPUs:", list_edge_tpus())

MODEL = "/opt/inference-server/models/ssd_mobilenet_v2_coco_quant_postprocess_edgetpu.tflite"

interpreter = make_interpreter(MODEL)
interpreter.allocate_tensors()

print("Modelo Coral cargado correctamente")
