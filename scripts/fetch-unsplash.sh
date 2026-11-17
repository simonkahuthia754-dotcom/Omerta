#!/bin/sh
# Downloads the Unsplash place photos (free licence) into public/img. Runs in CI where the internet is open.
set -e
D=public/img; mkdir -p "$D"; fail=0
while read -r id photo; do
  [ -z "$id" ] && continue
  out="$D/land-$id.jpg"
  [ -s "$out" ] && continue
  curl -fsSL --retry 3 -m 60 "https://images.unsplash.com/$photo?ixlib=rb-4.1.0&q=78&fm=jpg&w=900&h=600&fit=crop&crop=entropy&cs=srgb" -o "$out" || { echo "FAILED $id"; fail=1; }
done <<'LIST'
l4_7 photo-1672264597620-d792bb6de88d
l5_2 photo-1610375229632-c7158c35a537
l5_4 photo-1663143050642-69240b347b2b
l5_5 photo-1697886637099-205413d17b9a
l5_6 photo-1544989164-22f292ae11b7
l5_7 photo-1614531341773-3bff8b7cb3fc
l6_0 photo-1584003564911-a7a321c84e1c
l6_2 photo-1580674684081-7617fbf3d745
l6_3 photo-1575999502951-4ab25b5ca889
l6_4 photo-1586302836983-d1efb5eee221
l6_5 photo-1780857774274-079152a315f8
l6_6 photo-1618578907040-e8e81b085dfb
l7_0 photo-1575527048208-6475b441e0a0
l7_2 photo-1506970845246-18f21d533b20
l7_3 photo-1667759318615-757c8ddbfa7a
l7_4 photo-1738508804646-90d568854d7e
l7_5 photo-1624138784614-87fd1b6528f8
l7_6 photo-1551415923-31d2072bc248
l8_0 photo-1770723965031-65f135a58636
LIST
# Sector photos: every item in the Economy tab shows its sector.
while read -r id photo; do
  [ -z "$id" ] && continue
  out="$D/eco-sector-$id.jpg"
  [ -s "$out" ] && continue
  curl -fsSL --retry 3 -m 60 "https://images.unsplash.com/$photo?ixlib=rb-4.1.0&q=78&fm=jpg&w=700&h=520&fit=crop&crop=entropy&cs=srgb" -o "$out" || { echo "FAILED sector $id"; fail=1; }
done <<'LIST2'
tr photo-1618642624018-a370cbf3cd80
st photo-1675602488512-bdd631490fcb
sp photo-1700508317396-e343a69ac72f
mi photo-1778003369751-b42b97227661
re photo-1788129114780-0eec6ed88740
ag photo-1563514227147-6d2ff665a6a0
hf photo-1626315869436-d6781ba69d6e
mil photo-1719553946838-1190abdeee92
me photo-1785895285790-cdee03d0b2c4
fi photo-1534469650761-fce6cc26ac0d
fa photo-1414235077428-338989a2e8c0
lx photo-1604242692760-2f7b0c26856d
LIST2
for f in $(sed -n 's/^\(l[0-9]_[0-9]\) .*/\1/p' "$0"); do [ -s "$D/land-$f.jpg" ] || fail=1; done
exit $fail
