pragma circom 2.0.0;

// This circuit returns the sum of the inputs.
// n must be greater than 0.
template CalculateTotal(n) {
    // out inputs are the numbers to sum
    signal input nums[n];
    // the output will be the sum
    signal output sum;

    // store the sums in this signal 
    signal sums[n];
    // sum[0] is the first number 
    sums[0] <== nums[0];

    // start looping from the first number
    for (var i=1; i < n; i++) {
        // add to the sum at the next position the previous sum plus the next number
        sums[i] <== sums[i - 1] + nums[i];
    }

    // constrain the sum to be the last sum
    sum <== sums[n - 1];
}
