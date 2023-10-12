# Maci Primitives

## Trees 

In MACI, we have different types of trees that hold different values:

| Tree Name | Description | Specifics |
| --- | --- | --- |
| State Tree | Holds all signups | Participant public key and the timestamp at which they signed up (Applies to all Polls) |
| Ballot Tree | Holds the participants' votes | Poll specific |
| Message Tree | Holds participants' commands | Poll specific |

## Cryptographic Elements

### Baby Jubjub Curve

MACI uses the Baby Jubjub [curve](https://iden3-docs.readthedocs.io/en/latest/_downloads/33717d75ab84e11313cc0d8a090b636f/Baby-Jubjub.pdf) (BN-254). The `p` scalar field of choosing is:

$p=21888242871839275222246405745257275088548364400416034343698204186575808495617$

with generator:

$995203441582195749578291179787384436505546430278305826713579947235728471134$
$5472060717959818805561601436314318772137091100104008585924551046643952123905$

and within the finite field with modulo $p$.

