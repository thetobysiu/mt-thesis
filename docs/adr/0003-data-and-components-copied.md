# Data and components copied into this repository

The episode logs the thesis cites are committed in compacted form (reasoning stream and repeated prompt text removed, gzipped, about 78 MB) together with the result files, and the map and replay components are copied from mt-ai-lab rather than shared as a package. This keeps the site buildable and deployable from one repository with no download step; the cost is duplicated components and a regeneration script to run if mt-ai-lab's data ever changes, which it does not after the thesis.
