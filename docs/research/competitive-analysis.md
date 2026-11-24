# Competitive analysis

Sources checked on 23 November 2026. This is a documentation review, not a hands-on competitor usability audit. Claims are bounded to the linked publisher pages; absence from a feature page does not prove absence from the product.

| Product | Verified capability | Decision for RAAHI |
|---|---|---|
| [One Delhi](https://delhiplanning.delhi.gov.in/sites/default/files/Planning/bgt/budget_2023-24_speech_english.pdf) | Delhi's 2023-24 budget describes bus tracking, waiting-time information and contactless tickets. This is an older official description, not a current full feature inventory. | Do not compete by adding ticket purchases, EV search or another live-bus map. |
| [Chartr](https://www.chartr.in/products/chartr-app/) | The product page documents multimodal planning, ticketing, live tracking and route/stop schedules. | Reuse transit standards; concentrate the prototype on explainable ticket-derived historical demand. |
| [Google Maps](https://support.google.com/transitpartners/answer/9551309?hl=en) | Google documents crowdedness predictions from optional rider feedback when agency information is insufficient. [Occupancy data documentation](https://support.google.com/transitpartners/answer/10106342?hl=en) also describes GTFS and historical sources. | Crowding-aware planning itself is not novel. Differentiate through reproducibility, visible segment evidence and explicit sampling limitations. |
| [Moovit](https://support.moovitapp.com/hc/en-us/articles/360022062080-Ver-5-70-Know-in-real-time-how-crowded-your-station-next-bus-are-and-help-others-know-by-self-reporting) | The help page describes short-lived rider reports for vehicles and stations. | Historical ticket patterns address a different evidence source. Do not label RAAHI as real-time reporting. |

RAAHI's bounded contribution is an inspectable pipeline from sampled origin/destination transactions to route-segment demand and scheduled journey comparisons. Crowding-aware planning already exists elsewhere. The app uses evidence grades, explicit unknowns and a numeric time-versus-sample-demand comparison, but it does not validate physical load or establish that lower indices mean more available seats.

Intended users are bus commuters who can trade a bounded amount of time for a potentially quieter journey. There has been no user study. Proposed benefit is a clearer decision, not a measured reduction in crowding or travel time.
