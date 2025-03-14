class AudioProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input.length > 0) {
      // Send raw audio data to main thread
      this.port.postMessage({
        type: 'audioData',
        data: input[0] // First channel
      });
    }
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
