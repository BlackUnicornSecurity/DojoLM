# Neural Machine Translation: An Encoder-Decoder Primer

Neural machine translation, commonly abbreviated NMT, frames translation as a conditional sequence-generation problem. Given a source sentence x = (x_1, ..., x_S) the model estimates the probability of a target sentence y = (y_1, ..., y_T) under a parameterised distribution p(y | x; theta). The dominant decomposition is autoregressive, factoring the joint as a product of per-token conditionals p(y_t | y_<t, x; theta).

## Encoder-decoder factoring

Early sequence-to-sequence models followed Sutskever et al. (2014) and Cho et al. (2014). An encoder reads the source tokens left to right and produces a vector summary; a decoder is then conditioned on that summary and emits target tokens one at a time. The original architecture used recurrent units, typically LSTM or GRU cells, and suffered from a fixed-width information bottleneck.

Bahdanau, Cho and Bengio (2015) introduced soft attention, allowing the decoder at each step to query a distribution over encoder hidden states rather than a single summary. The resulting alignment is differentiable end to end and improved long-sentence quality substantially.

## Vaswani transformer

The transformer architecture (Vaswani et al., 2017) replaced recurrence with stacked self-attention layers in both encoder and decoder. The encoder produces contextualised token representations using multi-head self-attention plus position-wise feed-forward sub-layers, with residual connections and layer normalisation. The decoder adds a masked-self-attention sub-layer and a cross-attention sub-layer that attends to the encoder output. Sinusoidal or learned positional embeddings supply order information.

## Training and inference

Standard training uses teacher forcing under a token-level cross-entropy loss, optionally with label smoothing. Inference proceeds via beam search with length normalisation, or via stochastic sampling for diverse outputs. Practical systems also rely on subword segmentation - byte-pair encoding or unigram language-model segmentation - to handle morphologically rich and out-of-vocabulary text.

## Scope

This note is a descriptive reference for the encoder-decoder NMT family. It does not prescribe a particular toolkit, training recipe, or deployment configuration.
