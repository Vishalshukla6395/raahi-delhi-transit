from raahi.planner import compare_journeys


def option(minutes, index, coverage=1, evidence='moderate'):
    return dict(duration_minutes=minutes,demand_index=index,prediction_coverage=coverage,evidence=evidence)


def test_comparison_is_points_not_percent_and_includes_delayed_departure():
    c=compare_journeys(option(20,80),option(24,49),15)
    assert c['extra_minutes']==19
    assert c['index_points_lower']==31
    assert c['status']=='comparable'


def test_unknown_never_reports_a_reduction():
    c=compare_journeys(option(20,80),option(24,10,.5))
    assert c['index_points_lower'] is None
    assert c['status']=='unavailable'


def test_limited_evidence_is_flagged():
    assert compare_journeys(option(20,80),option(24,20,evidence='limited'))['status']=='limited'
