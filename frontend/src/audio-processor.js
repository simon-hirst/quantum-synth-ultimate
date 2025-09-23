class AudioProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input.length > 0) {
      this.port.postMessage({
        type: "audioData",
        data: input[0],
      });
    }
    return true;
  }
}

registerProcessor("audio-processor", AudioProcessor);
